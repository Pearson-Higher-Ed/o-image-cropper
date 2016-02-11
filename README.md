# o-image-cropper
Vanilla JavaScript Image Crop Component
====================================

Setup / Installation
--------------------

1. Include the provided JS and CSS files in your HTML document:

    <script type="text/javascript" src="cropper.js"></script>
    <link rel="stylesheet" href="cropper.css"></div>

2. Add your image to your document. Absolutely no other HTML markup is required:

    <img src="your-image.jpg" id="my_image" />

3. Initialize the Cropper, and you're good to go!

    <script type="text/javascript">
        document.getElementById('my_image').onload = function () {
            new Cropper(this, {
                // options
            });
        }
    </script>

Available options
-----------------

This is the list of options you can use to better interact with the script.
You use them by providing `name: value` pairs when instantiating the Cropper.
An usage example for each option is included below, and you can also see them all
in action on the **[demo page](http://dev.vizuina.com/cropper/)**.

**********************************************************

Option name:  update
Type:         Function
Description:  A function the Cropper calls automatically whenever the crop coordinates are changed.

    new Cropper(image, {
        update: function (coordinates) {
            /**
             * Do something with the crop coordinates, which are given as a simple JS object with four keys:
             * {x: 100, y: 200, width: 400, height: 200}
             */
            console.log(coordinates);
        }
    });

**********************************************************

Option name: ratio
Type:        Object
Description: Use this option if you want to restrict the aspect ratio of the crop area.

    new Cropper(image, {
        ratio: {
            width:  16,
            height: 9
        }
    });

**********************************************************

Option name: min_width / max_width / min_height / max_height
Type:        Integer
Description: Use any of these options to force the crop area to gave the desired minimum / maximum width / height.

    new Cropper(image, {
        min_width:  400,
        min_height: 300,
        max_width:  800,
        max_height: 600
    });


## License

This is a fork of [Financial-Times/o-image-cropper](https://github.com/Financial-Times/o-image-cropper), which is published by the Financial Times under the [MIT license](http://opensource.org/licenses/MIT).
