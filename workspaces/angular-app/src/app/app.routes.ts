import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControllerComponent } from './components/controller/controller.component';

export const routes: Routes = [
	{
		path: '',
		component: ControllerComponent,
	},
];
