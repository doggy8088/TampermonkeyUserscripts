import domtoimage from 'dom-to-image';
import { saveAs } from 'file-saver';

(function () {
    'use strict';

    window.domtoimage = domtoimage;

    window.saveAs = saveAs;


})();

// function captureScreenshot(element) {
//     return new Promise((resolve, reject) => {
//         domtoimage.toPng(element)
//             .then((dataUrl) => {
//                 resolve(dataUrl);
//             })
//             .catch((error) => {
//                 reject(error);
//             });
//     });
// }

// var url = await captureScreenshot(document.body)

// 簡單的網頁截圖功能 - DOM to Image
// https://www.letswrite.tw/dom-to-image/

// https://github.com/tsayen/dom-to-image

// https://github.com/eligrey/FileSaver.js/
