import { Component, ViewChild, AfterViewInit } from '@angular/core';

import { getAiSdkControls } from "../assets/helpers/ai-sdk/loader";
import {CameraComponent} from "./components/camera/camera.component";
declare global {
  var CY: any;
  var globalEl:any;
  var globalList:any;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild(CameraComponent) cameraComponent: CameraComponent;
  loadFaceTracker = false;

  ngAfterViewInit() {
    console.log('CameraComponent:', this.cameraComponent);

  }

  async logList(){
    console.log(globalThis.globalList)
  }

  async onPlayButtonClick() {
    console.log('Play button clicked');
    if (this.cameraComponent) {
      await this.cameraComponent.getMedia();
      await this.cameraComponent.play();

      console.log("el el ele",this.cameraComponent.camera)
      globalThis.globalEl = this.cameraComponent.camera;
      console.log("elelelel",globalThis.globalEl);
      await this.initializeAiSdk();
    } else {
      console.error('CameraComponent not found');
    }
  }

  async initializeAiSdk() {
    const { source, start } = await getAiSdkControls();
    // CameraComponent'ten video elementini kullan
    await source.useVideoElement(this.cameraComponent.camera.nativeElement).promise;

    // AI SDK'yı başlat
    await start();

    setTimeout(() => {
      this.loadFaceTracker = true;
    }, 0);
  }
}
