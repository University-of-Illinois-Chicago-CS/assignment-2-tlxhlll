# Assignment 2: Triangle meshes + transformations

In this assignment, you will be creating a visualization of terrain based on a digital elevation model (DEM). The input DEM data will consist of an map in the form of a greyscale image. The image will indicate the elevation of the terrain at every point in the map. Darker regions of the map  (black and darker grey tones) represent lower elevations. Brighter (i.e., white) represents higher elevation (e.g., mountain peaks). For example, the following image has been generated from USGS tiles showing mounts Rainier (top left) and Baker (bottom right) in Washington state.

![Mount Rainier](https://github.com/University-of-Illinois-Chicago-CS/cs425-assignment2/blob/main/rainier-small.jpeg?raw=true)

You will create a JS app lication that imports these images and create a triangle mesh that visualizes the terrain in 3D. The width and height of the map should be mapped to the X and Z dimensions respectively. The height of the terrain will be mapped to the Y axis. In other words, you will need to create a vertex for every pixel in the DEM data. The X, Y, and Z components for each vertex will be dictated by the column number, row number, and brightness of the pixel in the image. The vertices will in turn specify a triangle mesh that you will display using WebGL. The RGB colors of the vertices will be mapped to XYZ (normalized) coordinates. Here is what the visualization of the terrain should look like for the above image. Notice how the peaks of the mountains have a brighter green, with the Y coordinate (elevation) being mapped to green.

![Terrain render](https://github.com/University-of-Illinois-Chicago-CS/cs425-assignment2/blob/main/screenshot.png?raw=true)

In addition to showing the terrain, you will need to implement interactions that allow you to rotate the visualization (both around the Y and Z axes). You will also need to be able to zoom and pan the camera. These interactions will be mapped to sensible mouse gestures. For example, holding down the left mouse key while moving the mouse vertically should allow you to rotate around the Z axis. Horizontal movements (while holding down left key) can be mapped to rotation around the Y. Right mouse click and dragging should allow you to pan the image in the X-Z plane. Mouse wheel can be used to zoom.

To implement these interactions, you will need to utilize model-view transformations, composing matrices to achieve the desired rotation/zoom/pan combinations. Additionally, you will also need to add a slider that allows you to control the maximum height of the terrain during rendering. Lastly, the user should be able to change the projection from perspective to orthographic using a drop down menu. 

## Tasks

Here is a list of tasks that you need to implement

### Task 1

Implement a function that converts the image data into a triangle mesh, which will be uploaded to the GPU using standard vertex buffers and arrays.

### Task 2

Visualize the terrain, by getting the the triangle mesh to show on the screen. XYZ coordinates of the vertices should dictates the RGB color of those vertices. At minimum, your program should implement a perspective projection to view the mesh.

### Task 3 

Implement basic rotations (around the Y axis and Z axes) and zooming (in/out)

### Task 4

Implement a control slider that allows for dynamically changing the height of the terrain. Implement an option to switch between perspective and orthographic projections (e.g., using a drop down menu)

### Task 5

Implement a "panning" function that allows you to pan the camera. Note that the pan function should compose well with the rotation operations (i.e., the behavior of the pan operation should not disrupt the rotation, or vice versa)

### Task 6

Implement a checkbox that allows you to switch between two modes of viewing the mash: solid triangle faces or a "wireframe" mode that shows only the outlines of triangles.


## Grading policy

- If you complete task 1 only: E
- if you complete tasks 1-2: D
- Tasks 1-3: C
- Tasks 1-4: B
- Tasks 1-5: A (see caveat)
- For grad students, Task 6 is required to get an A. For undergrads, implementing it will give you 10% extra points. 

## Code use policy

You are not allowed to use external libraries. Everything must be implemented using WebGL and native JavaScript functionalities. However, you will be provided with a `util.js` code that implement matrix operations, projections, and auxiliary "look at" functionalities to help specifying camera transforms. You may use any combination of those in your code, plus any provided starter code. In particular, I have provided you with a function to load an input image and process it into an array of Float32Array (see `processImage`). To implement interactions with the mouse, the code also contains stubs for setting up event handlers (see `addMouseCallbacks`).

