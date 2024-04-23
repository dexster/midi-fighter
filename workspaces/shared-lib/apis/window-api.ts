import { ControllerData, MessageResponse } from "../models/controller";

export interface WindowApi {
	openFileDialog(callback: any): string; 
    saveFileDialog(filePath: string): string;
    showMessageBoxDialog(options: any): MessageResponse;
    readData(filePath?: string): ControllerData;
    writeData(actions: ControllerData): void;
    onFile(callback: (fileAction: string) => void): void;
    onEdit(callback: (editAction: string) => void): void;
    onTools(callback: (toolsAction: string) => void): void;
    updateMenu(actions: any): void;
}
