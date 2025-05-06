"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const whatsapp_service_1 = require("./whatsapp.service");
const fs = require("fs");
const path = require("path");
let WhatsappController = class WhatsappController {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    async sendFileToGroup(body) {
        const { groupName, filePath, caption } = body;
        if (!groupName || !filePath) {
            throw new common_1.BadRequestException('Faltan datos obligatorios');
        }
        try {
            await this.whatsappService.sendFileToGroup(groupName, filePath, caption || '');
            return { success: true, message: 'Archivo enviado correctamente' };
        }
        catch (err) {
            throw new common_1.BadRequestException(err.message);
        }
    }
    async getAllGroups() {
        return await this.whatsappService.listAllGroups();
    }
    async sendFileByGroupId(body) {
        const { groupId, filePath, caption } = body;
        if (!groupId || !filePath) {
            throw new common_1.BadRequestException('Faltan datos obligatorios: groupId y filePath');
        }
        try {
            await this.whatsappService.sendFileToGroupById(groupId, filePath, caption || '');
            return {
                success: true,
                message: 'Archivo enviado correctamente al grupo',
            };
        }
        catch (err) {
            throw new common_1.BadRequestException(err.message);
        }
    }
    async scheduleSend(files, body) {
        const { groupIds, scheduledTime } = body;
        if (!files.files?.length || !groupIds || !scheduledTime) {
            throw new common_1.BadRequestException('Faltan campos obligatorios');
        }
        const parsedGroups = JSON.parse(groupIds);
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir);
        const savedFilePaths = files.files.map((file) => {
            const filePath = path.join(uploadDir, file.originalname);
            fs.writeFileSync(filePath, file.buffer);
            return filePath;
        });
        await this.whatsappService.scheduleSendTask({
            filePaths: savedFilePaths,
            groupIds: parsedGroups,
            scheduledTime: new Date(scheduledTime),
        });
        return { success: true, message: 'Envío programado correctamente' };
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.Post)('send-file'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "sendFileToGroup", null);
__decorate([
    (0, common_1.Get)('groups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "getAllGroups", null);
__decorate([
    (0, common_1.Post)('send-file-by-id'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "sendFileByGroupId", null);
__decorate([
    (0, common_1.Post)('schedule-send'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: 'files', maxCount: 10 }])),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "scheduleSend", null);
exports.WhatsappController = WhatsappController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map