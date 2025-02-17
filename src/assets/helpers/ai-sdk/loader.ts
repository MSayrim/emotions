
import {Mutex} from 'async-mutex';

/*Prevents globalThis being reported as an error by eslint*/
/*global globalThis*/

// Singleton
var aiSdkInstance: any;
var source: any;

async function downloadAiSdk() {
  if (globalThis.CY) {
    throw new Error("AI-SDK has already been downloaded.");
  }
}

async function initAiSdk() {
  if (aiSdkInstance) {
    throw new Error("An instance of the AI-SDK is already running.");
  }
  source = new Source();
  // await source.useVideo("../assets/images/vvv.mp4");
  console.log(source);
  aiSdkInstance = await globalThis.CY.loader(source)
    // TODO INSERT YOUR LICENSE KEY HERE
    .licenseKey("sk4753cd236e0ee9e432009cbece6d07f2bd2b582349bc") // <--- ##############
    .source(source)
    .addModule(globalThis.CY.modules().FACE_DETECTOR.name)
    .addModule(globalThis.CY.modules().FACE_EMOTION.name, {
      enableBalancer: false, // example of custom setting
      smoothness: 0.5,
    })
    .addModule(globalThis.CY.modules().FACE_GENDER.name, {})
    .addModule(globalThis.CY.modules().FACE_AGE.name, {
      windowSizeMs: 4000, // example of custom setting
      maxVarianceCutoff: Math.pow(7, 2),
      numericalStability: 1,
    })
    .addModule(globalThis.CY.modules().FACE_FEATURES.name, {})
    .addModule(globalThis.CY.modules().FACE_POSITIVITY.name, {})
    .addModule(globalThis.CY.modules().FACE_POSE.name, {})
    .addModule(globalThis.CY.modules().FACE_AROUSAL_VALENCE.name, {
      smoothness: 0.9, // example of custom setting
    })
    .addModule(globalThis.CY.modules().FACE_ATTENTION.name, {})
    .addModule(globalThis.CY.modules().DATA_AGGREGATOR.name, {})
    .load();
}

/**
 * Loads the MorphCast SDK, only the first time, then returns the controls for the start / stop
 *
 * @returns {Promise<{getModule: *, stop: *, CY: *, start: *, source: *}>}
 */

export async function getAiSdkControls() {
  if (window.CY === undefined) {
    await downloadAiSdk();
  }
  if (aiSdkInstance === undefined) {
    await initAiSdk();
  }

  const { start, stop, getModule } = aiSdkInstance;
  return { start, stop, getModule, source, CY: window.CY };
}

class Source {
  currentSource:any;
  mutex:any;
  constructor() {
    this.currentSource = {
      getFrame: async () => {
      },
      start: async () => {
      },
      stop: () => {
      },
      stopped: true,
      isDummySource: true
    };
    this.mutex = new Mutex();
  }

  async getFrame(maxSize:any) {
    return await this.mutex.runExclusive(async ()=>{
      return await this.currentSource.getFrame(maxSize);
    });
  }

  async start() {
    return await this.mutex.runExclusive(async ()=> {
      return await this.currentSource.start();
    });
  }

  stop() {
    return this.currentSource.stop();
  }

  get stopped() {
    return this.currentSource.stopped;
  }

  getCurrentSource() {
    return this.currentSource;
  }

  async _safeReplace(source:any) {
    return await this.mutex.runExclusive(async () => {
      const wasStopped = this.currentSource.stopped;
      this.currentSource.stop();
      this.currentSource = source;
      if (!wasStopped) {
        await this.currentSource.start();
      }
      return this.currentSource;
    });
  }

  /**
   * Uses the specified video element as a source.
   *
   * @param videoEl the video element
   * @returns a Promise resolved as soon as the operation is completed, or rejected in case of error
   */
  async useVideoElement(videoEl:any) {
    return await this._safeReplace(globalThis.CY.createSource.fromVideoElement(videoEl));
  }
  async useVideo(videoUrl:any) {
    return await this._safeReplace(globalThis.CY.createSource.fromVideoUrl(videoUrl));
  }
  /**
   * Get a list of available camera devices.
   * Each object in the array describes one of the available video devices (only device-types for which permission has been granted are "available").
   * The order is significant - the default capture devices will be listed first.
   *
   * If enumeration fails, the promise is rejected.
   *
   * @example
   *
   * const videoDevices = await getAvailableCameraList();
   *
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async getAvailableCameraList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error("enumerateDevices() not supported.");
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");
    if (!isMobile() && videoDevices.length > 1) {
      console.log('TODO: openDialogSwitchCamera()');
    }
    return videoDevices;
  }

  /**
   *
   * Open a new camera stream and uses it as a source. Internally, it uses getUserMedia.
   *
   * @example
   *
   * const source = new Source();
   *
   * source.useCamera()
   *
   * // or...
   *
   * source.useCamera({deviceId: 0})
   *
   * // or...
   *
   * source.useCamera({deviceId: cameras[0].deviceId, toVideoElement: document.getElementById("videoEl")})
   *
   * @param deviceId optional; when a String is provided, it represents the deviceId of the camera. When an Integer is provided, it represent the element number in the ordered list returned by getAvailableCameraList() method.
   * @param toVideoElement optional; video tag that will receive getUserMedia stream as srcObject. If you don't specify any video element, an internal video element is used.
   * @param constraints optional; getUserMedia constraints
   * @param flip optional; Flips the acquired frame clockwise 90 degrees * flip value.
   * @returns a Promise resolved as soon as the operation is completed, or rejected in case of error
   */
  async useCamera({device=undefined, toVideoElement=undefined, constrain={}, flip=undefined} = {}) {
    var constraints: Object = constrain
    var deviceId: any = device;
    const videoDevices = await this.getAvailableCameraList();
    if (videoDevices.length === 0) {
      throw new Error("There are no camera devices available.");
    }

    if(Number.isInteger(deviceId)) {
      deviceId = videoDevices[deviceId].deviceId;
    }

    const config = {
      constraints: {
        audio : false,
        video : (deviceId ? {deviceId: {exact: deviceId}} : true),
        ...constraints
      },
      video: toVideoElement,
      flip
    };
    return await this._safeReplace(globalThis.CY.createSource.fromCamera(config));
  }
}

function isMobile() {
  return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\\-(n|u)|c55\/|capi|ccwa|cdm\\-|cell|chtm|cldc|cmd\\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\\-s|devi|dica|dmob|do(c|p)o|ds(12|\\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\\-|_)|g1 u|g560|gene|gf\\-5|g\\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\\-(m|p|t)|hei\\-|hi(pt|ta)|hp( i|ip)|hs\\-c|ht(c(\\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\\-(20|go|ma)|i230|iac( |\\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\\-[a-w])|libw|lynx|m1\\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\\-2|po(ck|rt|se)|prox|psio|pt\\-g|qa\\-a|qc(07|12|21|32|60|\\-[2-7]|i\\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\\-|oo|p\\-)|sdk\/|se(c(\\-|0|1)|47|mc|nd|ri)|sgh\\-|shar|sie(\\-|m)|sk\\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\\-|v\\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\\-|tdg\\-|tel(i|m)|tim\\-|t\\-mo|to(pl|sh)|ts(70|m\\-|m3|m5)|tx\\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\\-|your|zeto|zte\\-/i.test(navigator.userAgent.substr(0, 4));
}
