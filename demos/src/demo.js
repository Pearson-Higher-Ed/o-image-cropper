// import '../../main';
const ImageCropper =require('../../main').ImageCropper;

document.getElementById('cropper-image').onload = function () {
	console.log("loaded image");
	new ImageCropper(this, {
		ratio: {width: 1, height: 1},
		// min_width:100,
		// max_width:300,
		// min_height:100,
		// max_height:300,
		update: function (coordinates) {
					/**
					 * Do something with the crop coordinates, which are given as a simple JS object with four keys:
					 * {x: 100, y: 200, width: 400, height: 200}
					 */
		 console.log(coordinates);
		}
							// options
	});
};

document.addEventListener('DOMContentLoaded', () => {



// document.getElementById('cropper-image').src = 'https://drscdn.500px.org/photo/135343941/h%3D300/aeeccd218cd31b95c1b40cf4e49209bb';

	// let CView =new ImageCropper(document.getElementById('cropper-image'), {
  //      update: function (coordinates) {
  //            /**
  //             * Do something with the crop coordinates, which are given as a simple JS object with four keys:
  //             * {x: 100, y: 200, width: 400, height: 200}
  //             */
  //      	console.log(coordinates);
  //      }
  //   });




	document.dispatchEvent(new CustomEvent('o.DOMContentLoaded'));
});
