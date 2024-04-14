import { WindowApiConst } from 'shared-lib';
import { AbstractService } from './abstract-service';
// import { dialog } from 'electron';

export class FilesService extends AbstractService<string, string> {
	receptionChannel(): string {
		return WindowApiConst.FILES_INPUT;
	}

	sendingChannel(): string {
		return WindowApiConst.FILES_OUTPUT;
	}

	// process(input: number): number[] {
	 process(e: string): string {
		return 'C:/Users/username/Desktop/MyFile.json';
		
		// const { canceled, filePaths } = await dialog.showOpenDialog({
		// 	defaultPath: defaultPath,
		// 	filters: [{ name: 'Data', extensions: ['json'] }]
		// });
		// if (!canceled) {
		// 	return filePaths[0];
		// }
	}
}
