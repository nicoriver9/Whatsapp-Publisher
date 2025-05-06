import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia, Chat } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private isClientReady = false;
  private clientReadyPromise: Promise<void>;
  private resolveClientReady: () => void;

  onModuleInit() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
    });

    this.clientReadyPromise = new Promise<void>((resolve) => {
      this.resolveClientReady = resolve;
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp listo!');
      this.isClientReady = true;
      this.resolveClientReady();
    });

    this.client.initialize();
  }

  private async waitForClientReady(): Promise<void> {
    if (this.isClientReady) return;
    await this.clientReadyPromise;
  }

  async sendFileToGroup(groupName: string, filePath: string, caption: string) {
    const chats = await this.client.getChats();
    const groupChat = chats.find(
      (chat) =>
        chat.isGroup && chat.name.toLowerCase() === groupName.toLowerCase(),
    );

    if (!groupChat) {
      throw new Error(`Grupo "${groupName}" no encontrado`);
    }

    const media = MessageMedia.fromFilePath(filePath);
    await this.client.sendMessage(groupChat.id._serialized, media, { caption });
  }

  async listAllGroups(): Promise<{ name: string; id: string }[]> {
    await this.waitForClientReady();

    const chats = await this.client.getChats();
    return chats
      .filter((chat) => chat.isGroup)
      .map((group) => ({
        name: group.name,
        id: group.id._serialized,
      }));
  }

  async sendFileToGroupById(
    groupId: string,
    filePath: string,
    caption: string,
  ) {
    await this.waitForClientReady();

    const media = MessageMedia.fromFilePath(filePath);
    await this.client.sendMessage(groupId, media, { caption });
  }

  async scheduleSendTask(data: {
    filePaths: string[];
    groupIds: string[];
    scheduledTime: Date;
  }) {
    const now = new Date();
    const delay = data.scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn('⏱️ Tiempo de envío ya pasó, enviando inmediatamente...');
      await this.sendNow(data.filePaths, data.groupIds);
      return;
    }

    console.log(`⏳ Envío programado en ${delay / 1000} segundos`);

    setTimeout(async () => {
      console.log('🚀 Ejecutando envío programado...');
      await this.sendNow(data.filePaths, data.groupIds);
    }, delay);
  }

  private async sendNow(filePaths: string[], groupIds: string[]) {
    await this.waitForClientReady();

    for (const groupId of groupIds) {
      for (const filePath of filePaths) {
        const media = MessageMedia.fromFilePath(filePath);
        await this.client.sendMessage(groupId, media);
        console.log(`✅ Archivo ${filePath} enviado a grupo ${groupId}`);
      }
    }
  }
}
