import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { WhatsappService } from './whatsapp.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send-file')
  async sendFileToGroup(
    @Body() body: { groupName: string; filePath: string; caption?: string },
  ) {
    const { groupName, filePath, caption } = body;

    if (!groupName || !filePath) {
      throw new BadRequestException('Faltan datos obligatorios');
    }

    try {
      await this.whatsappService.sendFileToGroup(
        groupName,
        filePath,
        caption || '',
      );
      return { success: true, message: 'Archivo enviado correctamente' };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Get('groups')
  async getAllGroups() {
    return await this.whatsappService.listAllGroups();
  }

  @Post('send-file-by-id')
  async sendFileByGroupId(
    @Body() body: { groupId: string; filePath: string; caption?: string },
  ) {
    const { groupId, filePath, caption } = body;

    if (!groupId || !filePath) {
      throw new BadRequestException(
        'Faltan datos obligatorios: groupId y filePath',
      );
    }

    try {
      await this.whatsappService.sendFileToGroupById(
        groupId,
        filePath,
        caption || '',
      );
      return {
        success: true,
        message: 'Archivo enviado correctamente al grupo',
      };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @Post('schedule-send')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  async scheduleSend(
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Body() body: { groupIds: string; scheduledTime: string },
  ) {
    const { groupIds, scheduledTime } = body;

    if (!files.files?.length || !groupIds || !scheduledTime) {
      throw new BadRequestException('Faltan campos obligatorios');
    }

    const parsedGroups = JSON.parse(groupIds);
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const savedFilePaths = files.files.map((file) => {
      const filePath = path.join(uploadDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
      return filePath;
    });

    // ✅ Programar el envío real
    await this.whatsappService.scheduleSendTask({
      filePaths: savedFilePaths,
      groupIds: parsedGroups,
      scheduledTime: new Date(scheduledTime),
    });

    return { success: true, message: 'Envío programado correctamente' };
  }

  @Get('uploaded-files')
  getUploadedFiles() {
    const dir = './uploads';
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir);
    return files.map((filename) => ({
      name: filename,
      path: `/uploads/${filename}`, // opcional si querés servirlos estáticos
    }));
  }

  @Post('schedule-file')
  async scheduleSingleFile(
    @Body()
    body: {
      filename: string;
      groupIds: string[];
      scheduledTime: string;
    },
  ) {
    const { filename, groupIds, scheduledTime } = body;
    const filePath = path.join('./uploads', filename);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    await this.whatsappService.scheduleSendTask({
      filePaths: [filePath],
      groupIds,
      scheduledTime: new Date(scheduledTime),
    });

    return { success: true, message: 'Archivo programado' };
  }

  @Get('get-qr')
  getQRCodeStatus() {
    const status = this.whatsappService.getClientStatus();

    if (status === 'authenticated' || status === 'ready') {
      return { message: 'ready' };
    }

    const qr = this.whatsappService.getQRCode();

    if (status === 'qr' && qr) {
      return { qrCode: qr };
    }

    return { message: 'Client status unknown or initializing' };
  }

  @Post('restart-client')
  async restartClient() {
    try {
      await this.whatsappService.restartClient();
      return { message: 'Cliente de WhatsApp reiniciado correctamente' };
    } catch (error) {
      return {
        message: 'Error al reiniciar el cliente',
        error: error.message,
      };
    }
  }

  @Post('upload-files')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 20 }]))
  async uploadFiles(@UploadedFiles() files: { files?: Express.Multer.File[] }) {
    if (!files.files?.length) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const savedFiles = files.files.map((file) => {
      const filePath = path.join(uploadDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
      return {
        name: file.originalname,
        path: filePath,
      };
    });

    return savedFiles;
  }
}
