import { WhatsappService } from './whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    sendFileToGroup(body: {
        groupName: string;
        filePath: string;
        caption?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getAllGroups(): Promise<{
        name: string;
        id: string;
    }[]>;
    sendFileByGroupId(body: {
        groupId: string;
        filePath: string;
        caption?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    scheduleSend(files: {
        files?: Express.Multer.File[];
    }, body: {
        groupIds: string;
        scheduledTime: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
