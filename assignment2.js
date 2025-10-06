import vertexShaderSrc from './vertex.glsl.js';
import fragmentShaderSrc from './fragment.glsl.js'

var gl = null;
var vao = null;
var vaoWireframe = null;
var program = null;
var vertexCount = 0;
var wireframeVertexCount = 0;
var uniformModelViewLoc = null;
var uniformProjectionLoc = null;
var uniformHeightScaleLoc = null;
var heightmapData = null;

// Transformation state
var rotationY = 0;
var rotationZ = 0;
var zoomLevel = 1.0;
var heightScale = 1.0;
var projectionType = "perspective";
var panX = 0.0;
var panZ = 0.0;
var wireframeMode = false;

function processImage(img)
{
	// draw the image into an off-screen canvas
	var off = document.createElement('canvas');
	
	var sw = img.width, sh = img.height;
	off.width = sw; off.height = sh;
	
	var ctx = off.getContext('2d');
	ctx.drawImage(img, 0, 0, sw, sh);
	
	// read back the image pixel data
	var imgd = ctx.getImageData(0,0,sw,sh);
	var px = imgd.data;
	
	// create a an array will hold the height value
	var heightArray = new Float32Array(sw * sh);
	
	// loop through the image, rows then columns
	for (var y=0;y<sh;y++) 
	{
		for (var x=0;x<sw;x++) 
		{
			// offset in the image buffer
			var i = (y*sw + x)*4;
			
			// read the RGB pixel value
			var r = px[i+0], g = px[i+1], b = px[i+2];
			
			// convert to greyscale value between 0 and 1
			var lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255.0;

			// store in array
			heightArray[y*sw + x] = lum;
		}
	}

	return {
		data: heightArray,
		width: sw,
		height: sh
	};
}


window.loadImageFile = function(event)
{

	var f = event.target.files && event.target.files[0];
	if (!f) return;
	
	// create a FileReader to read the image file
	var reader = new FileReader();
	reader.onload = function() 
	{
		// create an internal Image object to hold the image into memory
		var img = new Image();
		img.onload = function() 
		{
			// heightmapData is globally defined
			heightmapData = processImage(img);

			console.log('loaded image: ' + heightmapData.width + ' x ' + heightmapData.height);

			// Create triangle mesh from heightmap
			var terrain = createTerrainMesh(heightmapData);
			vertexCount = terrain.positions.length / 3;
			wireframeVertexCount = terrain.wireframePositions.length / 3;
			console.log('Generated ' + vertexCount + ' vertices, ' + wireframeVertexCount + ' wireframe vertices');

			// Create solid mesh buffer and VAO
			var terrainVertices = new Float32Array(terrain.positions);
			var posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, terrainVertices);

			var posAttribLoc = gl.getAttribLocation(program, "position");
			vao = createVAO(gl, posAttribLoc, posBuffer, null, null, null, null);

			// Create wireframe buffer and VAO
			var wireframeVertices = new Float32Array(terrain.wireframePositions);
			var wireframePosBuffer = createBuffer(gl, gl.ARRAY_BUFFER, wireframeVertices);
			vaoWireframe = createVAO(gl, posAttribLoc, wireframePosBuffer, null, null, null, null);

			console.log('Terrain mesh created and ready to render');

		};
		img.onerror = function() 
		{
			console.error("Invalid image file.");
			alert("The selected file could not be loaded as an image.");
		};

		// the source of the image is the data load from the file
		img.src = reader.result;
	};
	reader.readAsDataURL(f);
}


function setupViewMatrix(eye, target)
{
    var forward = normalize(subtract(target, eye));
    var upHint  = [0, 1, 0];

    var right = normalize(cross(forward, upHint));
    var up    = cross(right, forward);

    var view = lookAt(eye, target, up);
    return view;

}
function draw()
{

	var aspectRatio = +gl.canvas.width / +gl.canvas.height;
	var projectionMatrix;

	if (projectionType === "perspective") {
		// Perspective projection
		var fovRadians = 60 * Math.PI / 180;
		var nearClip = 0.1;
		var farClip = 100.0;

		projectionMatrix = perspectiveMatrix(
			fovRadians,
			aspectRatio,
			nearClip,
			farClip,
		);
	} else {
		// Orthographic projection
		var viewSize = 2.0;
		var left = -viewSize * aspectRatio;
		var right = viewSize * aspectRatio;
		var bottom = -viewSize;
		var top = viewSize;
		var near = 0.1;
		var far = 100.0;

		projectionMatrix = orthographicMatrix(left, right, bottom, top, near, far);
	}

	// eye and target - position camera to view terrain from above and at an angle
	var eye = [0, 2, 3];
	var target = [0, 0.3, 0];

	var modelMatrix = identityMatrix();

	// Apply transformations in order: translate, scale, rotate
	var translateMat = translateMatrix(panX, 0, panZ);
	var scaleMat = scaleMatrix(zoomLevel, zoomLevel, zoomLevel);
	var rotYMat = rotateYMatrix(rotationY);
	var rotZMat = rotateZMatrix(rotationZ);

	// Combine transformations: rotation first (applied last), then scale, then pan
	modelMatrix = multiplyArrayOfMatrices([translateMat, rotYMat, rotZMat, scaleMat]);

	// setup viewing matrix
	var eyeToTarget = subtract(target, eye);
	var viewMatrix = setupViewMatrix(eye, target);

	// model-view Matrix = view * model
	var modelviewMatrix = multiplyMatrices(viewMatrix, modelMatrix);


	// enable depth testing
	gl.enable(gl.DEPTH_TEST);

	// disable face culling to render both sides of the triangles
	gl.disable(gl.CULL_FACE);

	gl.clearColor(0.2, 0.2, 0.2, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.useProgram(program);
	
	// update modelview and projection matrices to GPU as uniforms
	gl.uniformMatrix4fv(uniformModelViewLoc, false, new Float32Array(modelviewMatrix));
	gl.uniformMatrix4fv(uniformProjectionLoc, false, new Float32Array(projectionMatrix));
	gl.uniform1f(uniformHeightScaleLoc, heightScale);

	// Only draw if we have vertices
	if (wireframeMode && vaoWireframe && wireframeVertexCount > 0) {
		// Draw wireframe using pre-built line geometry
		gl.bindVertexArray(vaoWireframe);
		gl.drawArrays(gl.LINES, 0, wireframeVertexCount);
	} else if (vao && vertexCount > 0) {
		// Draw solid triangles
		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}

	requestAnimationFrame(draw);

}

function createBox()
{
	function transformTriangle(triangle, matrix) {
		var v1 = [triangle[0], triangle[1], triangle[2], 1];
		var v2 = [triangle[3], triangle[4], triangle[5], 1];
		var v3 = [triangle[6], triangle[7], triangle[8], 1];

		var newV1 = multiplyMatrixVector(matrix, v1);
		var newV2 = multiplyMatrixVector(matrix, v2);
		var newV3 = multiplyMatrixVector(matrix, v3);

		return [
			newV1[0], newV1[1], newV1[2],
			newV2[0], newV2[1], newV2[2],
			newV3[0], newV3[1], newV3[2]
		];
	}

	var box = [];

	var triangle1 = [
		-1, -1, +1,
		-1, +1, +1,
		+1, -1, +1,
	];
	box.push(...triangle1)

	var triangle2 = [
		+1, -1, +1,
		-1, +1, +1,
		+1, +1, +1
	];
	box.push(...triangle2);

	// 3 rotations of the above face
	for (var i=1; i<=3; i++) 
	{
		var yAngle = i* (90 * Math.PI / 180);
		var yRotMat = rotateYMatrix(yAngle);

		var newT1 = transformTriangle(triangle1, yRotMat);
		var newT2 = transformTriangle(triangle2, yRotMat);

		box.push(...newT1);
		box.push(...newT2);
	}

	// a rotation to provide the base of the box
	var xRotMat = rotateXMatrix(90 * Math.PI / 180);
	box.push(...transformTriangle(triangle1, xRotMat));
	box.push(...transformTriangle(triangle2, xRotMat));


	return {
		positions: box
	};

}

function createTerrainMesh(heightmapData)
{
	var positions = [];
	var wireframePositions = [];
	var width = heightmapData.width;
	var height = heightmapData.height;
	var data = heightmapData.data;

	// Normalize coordinates to range [-1, 1]
	// Each grid cell will form two triangles
	for (var row = 0; row < height - 1; row++)
	{
		for (var col = 0; col < width - 1; col++)
		{
			// Get the four corners of the current grid cell
			// Normalize x and z to [-1, 1], y is the height value [0, 1]
			var x0 = (col / (width - 1)) * 2 - 1;
			var x1 = ((col + 1) / (width - 1)) * 2 - 1;
			var z0 = (row / (height - 1)) * 2 - 1;
			var z1 = ((row + 1) / (height - 1)) * 2 - 1;

			// Get height values from the heightmap
			var y00 = data[row * width + col];
			var y10 = data[row * width + (col + 1)];
			var y01 = data[(row + 1) * width + col];
			var y11 = data[(row + 1) * width + (col + 1)];

			// Triangle 1: top-left, bottom-left, top-right
			positions.push(x0, y00, z0);  // top-left
			positions.push(x0, y01, z1);  // bottom-left
			positions.push(x1, y10, z0);  // top-right

			// Triangle 2: top-right, bottom-left, bottom-right
			positions.push(x1, y10, z0);  // top-right
			positions.push(x0, y01, z1);  // bottom-left
			positions.push(x1, y11, z1);  // bottom-right

			// Wireframe lines for both triangles
			// Triangle 1 edges
			wireframePositions.push(x0, y00, z0, x0, y01, z1); // edge 1
			wireframePositions.push(x0, y01, z1, x1, y10, z0); // edge 2
			wireframePositions.push(x1, y10, z0, x0, y00, z0); // edge 3

			// Triangle 2 edges (avoiding duplicate edges)
			wireframePositions.push(x0, y01, z1, x1, y11, z1); // edge 4
			wireframePositions.push(x1, y11, z1, x1, y10, z0); // edge 5
		}
	}

	return {
		positions: positions,
		wireframePositions: wireframePositions
	};
}

var isDragging = false;
var startX, startY;
var leftMouse = false;

function addMouseCallback(canvas)
{
	isDragging = false;

	canvas.addEventListener("mousedown", function (e) 
	{
		if (e.button === 0) {
			console.log("Left button pressed");
			leftMouse = true;
		} else if (e.button === 2) {
			console.log("Right button pressed");
			leftMouse = false;
		}

		isDragging = true;
		startX = e.offsetX;
		startY = e.offsetY;
	});

	canvas.addEventListener("contextmenu", function(e)  {
		e.preventDefault(); // disables the default right-click menu
	});


	canvas.addEventListener("wheel", function(e)  {
		e.preventDefault(); // prevents page scroll

		if (e.deltaY < 0)
		{
			// Zoom in
			zoomLevel *= 1.1;
		} else {
			// Zoom out
			zoomLevel *= 0.9;
		}

		// Update slider to reflect zoom level
		var scaleSlider = document.getElementById("scale");
		if (scaleSlider) {
			scaleSlider.value = (zoomLevel - 0.5) * 100;
		}
	});

	document.addEventListener("mousemove", function (e) {
		if (!isDragging) return;
		var currentX = e.offsetX;
		var currentY = e.offsetY;

		var deltaX = currentX - startX;
		var deltaY = currentY - startY;

		if (leftMouse) {
			// Left mouse: horizontal movement for Y rotation, vertical for Z rotation
			rotationY += deltaX * 0.01;
			rotationZ += deltaY * 0.01;

			// Update Y rotation slider
			var rotSlider = document.getElementById("rotation");
			if (rotSlider) {
				rotSlider.value = (rotationY * 180 / Math.PI) % 360;
			}
		} else {
			// Right mouse: pan in X-Z plane
			panX += deltaX * 0.003;
			panZ -= deltaY * 0.003; // Negative because screen Y is inverted
		}

		startX = currentX;
		startY = currentY;
	});

	document.addEventListener("mouseup", function () {
		isDragging = false;
	});

	document.addEventListener("mouseleave", () => {
		isDragging = false;
	});
}

function initialize() 
{
	var canvas = document.querySelector("#glcanvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	gl = canvas.getContext("webgl2");

	// add mouse callbacks
	addMouseCallback(canvas);

	// Add slider event listeners
	var rotationSlider = document.getElementById("rotation");
	if (rotationSlider) {
		rotationSlider.addEventListener("input", function() {
			rotationY = this.value * Math.PI / 180;
		});
	}

	var scaleSlider = document.getElementById("scale");
	if (scaleSlider) {
		scaleSlider.addEventListener("input", function() {
			zoomLevel = 0.5 + this.value / 100;
		});
	}

	var heightSlider = document.getElementById("height");
	if (heightSlider) {
		heightSlider.addEventListener("input", function() {
			heightScale = this.value / 50; // Range: 0 to 2
		});
	}

	var projectionSelect = document.getElementById("projection");
	if (projectionSelect) {
		projectionSelect.addEventListener("change", function() {
			projectionType = this.value;
		});
	}

	var wireframeCheckbox = document.getElementById("wireframe");
	if (wireframeCheckbox) {
		wireframeCheckbox.addEventListener("change", function() {
			wireframeMode = this.checked;
		});
	}

	// Create shaders and program
	var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
	var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
	program = createProgram(gl, vertexShader, fragmentShader);

	// uniforms
	uniformModelViewLoc = gl.getUniformLocation(program, 'modelview');
	uniformProjectionLoc = gl.getUniformLocation(program, 'projection');
	uniformHeightScaleLoc = gl.getUniformLocation(program, 'heightScale');

	// Initialize with a default box
	var box = createBox();
	vertexCount = box.positions.length / 3;
	console.log('Created default box with ' + vertexCount + ' vertices');

	var boxVertices = new Float32Array(box.positions);
	var posBuffer = createBuffer(gl, gl.ARRAY_BUFFER, boxVertices);

	var posAttribLoc = gl.getAttribLocation(program, "position");
	vao = createVAO(gl,
		posAttribLoc, posBuffer,
		null, null,
		null, null
	);

	window.requestAnimationFrame(draw);
}

window.onload = initialize();