import { OnModuleInit } from '@nestjs/common';
export declare class WhatsappService implements OnModuleInit {
    private client;
    private isClientReady;
    private clientReadyPromise;
    private resolveClientReady;
    onModuleInit(): void;
    private initializeClient;
    private waitForClientReady;
    sendFileToGroup(groupName: string, filePath: string, caption: string): Promise<void>;
    listAllGroups(): Promise<{
        name: string;
        id: string;
    }[]>;
    sendFileToGroupById(groupId: string, filePath: string, caption: string): Promise<void>;
    scheduleSendTask(data: {
        filePaths: string[];
        groupIds: string[];
        scheduledTime: Date;
    }): Promise<void>;
    private sendNow;
}
