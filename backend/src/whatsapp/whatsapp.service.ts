import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia, Chat } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private isClientReady = false;
  private clientReadyPromise: Promise<void>;
  private resolveClientReady: () => void;

  // Nuevas propiedades para QR y estado del cliente
  private qrCode: string | null = null;
  private clientStatus: 'initializing' | 'qr' | 'authenticated' | 'ready' | 'disconnected' = 'initializing';

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

    this.clientReadyPromise = new Promise<void>((resolve) => {
      this.resolveClientReady = resolve;
    });

    // Capturar QR y convertirlo a base64
    this.client.on('qr', async (qr) => {
      this.clientStatus = 'qr';
      this.qrCode = await qrcode.toDataURL(qr);
      console.log('🔑 Escaneá el código QR para iniciar sesión en WhatsApp');
    });

    // Cliente listo
    this.client.on('ready', () => {
      this.clientStatus = 'ready';
      this.isClientReady = true;
      this.resolveClientReady();
      console.log('✅ WhatsApp listo!');
    });

    // Cliente autenticado
    this.client.on('authenticated', () => {
      this.clientStatus = 'authenticated';
      console.log('🔒 Cliente autenticado');
    });

    // Cliente desconectado
    this.client.on('disconnected', () => {
      this.clientStatus = 'disconnected';
      console.warn('⚠️ Cliente desconectado');
    });

    this.client.initialize();
  }

  private async waitForClientReady(): Promise<void> {
    if (this.isClientReady) return;
    await this.clientReadyPromise;
  }

  // Public method: estado del cliente
  getClientStatus(): string {
    return this.clientStatus;
  }

  // Public method: QR en base64
  getQRCode(): string | null {
    return this.qrCode;
  }

  // Enviar archivo por nombre de grupo
  async sendFileToGroup(groupName: string, filePath: string, caption: string) {
    await this.waitForClientReady();

    const chats = await this.client.getChats();
    const groupChat = chats.find(
      (chat) => chat.isGroup && chat.name.toLowerCase() === groupName.toLowerCase(),
    );

    if (!groupChat) {
      throw new Error(`Grupo "${groupName}" no encontrado`);
    }

    const media = MessageMedia.fromFilePath(filePath);
    await this.client.sendMessage(groupChat.id._serialized, media, { caption });
  }

  // Enviar archivo por ID de grupo
  async sendFileToGroupById(groupId: string, filePath: string, caption: string) {
    await this.waitForClientReady();

    const media = MessageMedia.fromFilePath(filePath);
    await this.client.sendMessage(groupId, media, { caption });
  }

  // Listar todos los grupos disponibles
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

  // Programar un envío para más adelante
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

  // Envío inmediato (usado por schedule o envío manual)
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


  async restartClient(): Promise<void> {
    console.log('♻️ Reiniciando cliente de WhatsApp...');
  
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('🛑 Cliente destruido correctamente');
      } catch (err) {
        console.error('⚠️ Error al destruir el cliente:', err);
      }
    }
  
    // Reinicializar como al principio
    this.isClientReady = false;
    this.clientStatus = 'initializing';
  
    this.clientReadyPromise = new Promise<void>((resolve) => {
      this.resolveClientReady = resolve;
    });
  
    this.initializeClient();
  }
  

}
