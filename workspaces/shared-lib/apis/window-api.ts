import { ControllerData } from "../models/controller";

export interface WindowApi {
	openFile(filePath: string): string; 
    saveFile(filePath: string): string;
    readData(filePath?: string): ControllerData;
    writeData(actions: string, filePath: string): void;
}
