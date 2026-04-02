import { mat4 } from 'https://unpkg.com/wgpu-matrix@3.0.0/dist/3.x/wgpu-matrix.module.js';

const cubeVertexSize = 4 * 10;
const cubePositionOffset = 0;
const cubeUVOffset = 4 * 8;
const cubeVertexCount = 36;

const cubeVertexArray = new Float32Array([
	// float4 position, float4 color, float2 uv,
	1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
	-1, -1, 1, 1,  0, 0, 1, 1,  1, 1,
	-1, -1, -1, 1, 0, 0, 0, 1,  1, 0,
	1, -1, -1, 1,  1, 0, 0, 1,  0, 0,
	1, -1, 1, 1,   1, 0, 1, 1,  0, 1,
	-1, -1, -1, 1, 0, 0, 0, 1,  1, 0,

	1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
	1, -1, 1, 1,   1, 0, 1, 1,  1, 1,
	1, -1, -1, 1,  1, 0, 0, 1,  1, 0,
	1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
	1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
	1, -1, -1, 1,  1, 0, 0, 1,  1, 0,

	-1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
	1, 1, 1, 1,    1, 1, 1, 1,  1, 1,
	1, 1, -1, 1,   1, 1, 0, 1,  1, 0,
	-1, 1, -1, 1,  0, 1, 0, 1,  0, 0,
	-1, 1, 1, 1,   0, 1, 1, 1,  0, 1,
	1, 1, -1, 1,   1, 1, 0, 1,  1, 0,

	-1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
	-1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
	-1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
	-1, -1, -1, 1, 0, 0, 0, 1,  0, 0,
	-1, -1, 1, 1,  0, 0, 1, 1,  0, 1,
	-1, 1, -1, 1,  0, 1, 0, 1,  1, 0,

	1, 1, 1, 1,    1, 1, 1, 1,  0, 1,
	-1, 1, 1, 1,   0, 1, 1, 1,  1, 1,
	-1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
	-1, -1, 1, 1,  0, 0, 1, 1,  1, 0,
	1, -1, 1, 1,   1, 0, 1, 1,  0, 0,
	1, 1, 1, 1,    1, 1, 1, 1,  0, 1,

	1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
	-1, -1, -1, 1, 0, 0, 0, 1,  1, 1,
	-1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
	1, 1, -1, 1,   1, 1, 0, 1,  0, 0,
	1, -1, -1, 1,  1, 0, 0, 1,  0, 1,
	-1, 1, -1, 1,  0, 1, 0, 1,  1, 0,
]);

const basicVertWGSL = `
struct Uniforms {
	modelViewProjectionMatrix : mat4x4f,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
	@builtin(position) Position : vec4f,
	@location(0) fragUV : vec2f,
	@location(1) fragPosition: vec4f,
}

@vertex
fn main(
	@location(0) position : vec4f,
	@location(1) uv : vec2f
) -> VertexOutput {
	var output : VertexOutput;
	output.Position = uniforms.modelViewProjectionMatrix * position;
	output.fragUV = uv;
	output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
	return output;
}
`;

const vertexPositionColorWGSL = `
@fragment
fn main(
	@location(0) fragUV: vec2f,
	@location(1) fragPosition: vec4f
) -> @location(0) vec4f {
	return fragPosition;
}
`;

async function init() {
	if (!navigator.gpu) {
		throw new Error("WebGPU not supported on this browser.");
	}

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw new Error("No appropriate GPUAdapter found.");
	}

	const device = await adapter.requestDevice();

	const canvas = document.querySelector('canvas');
	const context = canvas.getContext('webgpu');

	const devicePixelRatio = window.devicePixelRatio || 1;
	canvas.width = canvas.clientWidth * devicePixelRatio;
	canvas.height = canvas.clientHeight * devicePixelRatio;
	const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

	context.configure({
		device,
		format: presentationFormat,
		alphaMode: 'premultiplied',
	});

	// ─── Screensaver: 2D position & velocity ──────────────────────────────────
	//
	// Cube is placed at z = -CAMERA_DIST in view space.
	// At that depth, the visible half-extents (world units) are:
	//   halfY = tan(fovY/2) * CAMERA_DIST
	//   halfX = halfY * aspect
	// The cube itself has half-size = 1 unit, so we shrink the bounce box by 1.
	//
	const CAMERA_DIST   = 4.0;
	const FOV_Y         = (2 * Math.PI) / 5;
	const CUBE_HALF     = 1.0;           // half-size of cube in world units
	const MOVE_SPEED    = 1.8;           // world-units per second

	const aspect = canvas.width / canvas.height;
	const visHalfY = Math.tan(FOV_Y / 2) * CAMERA_DIST;
	const visHalfX = visHalfY * aspect;
	const boundX = visHalfX - CUBE_HALF;
	const boundY = visHalfY - CUBE_HALF;

	// Random initial direction (avoid pure axis-aligned angles for visual interest)
	const initAngle = Math.random() * 2 * Math.PI;
	let posX = 0, posY = 0;
	let velX = Math.cos(initAngle) * MOVE_SPEED;
	let velY = Math.sin(initAngle) * MOVE_SPEED;

	let lastTime = performance.now();
	// ──────────────────────────────────────────────────────────────────────────

	// Create a vertex buffer from the cube data.
	const verticesBuffer = device.createBuffer({
		size: cubeVertexArray.byteLength,
		usage: GPUBufferUsage.VERTEX,
		mappedAtCreation: true,
	});
	new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
	verticesBuffer.unmap();

	const pipeline = device.createRenderPipeline({
		layout: 'auto',
		vertex: {
			module: device.createShaderModule({ code: basicVertWGSL }),
			buffers: [
				{
					arrayStride: cubeVertexSize,
					attributes: [
						{ shaderLocation: 0, offset: cubePositionOffset, format: 'float32x4' },
						{ shaderLocation: 1, offset: cubeUVOffset,        format: 'float32x2' },
					],
				},
			],
		},
		fragment: {
			module: device.createShaderModule({ code: vertexPositionColorWGSL }),
			targets: [{ format: presentationFormat }],
		},
		primitive: {
			topology: 'triangle-list',
			cullMode: 'back',
		},
		depthStencil: {
			depthWriteEnabled: true,
			depthCompare: 'less',
			format: 'depth24plus',
		},
	});

	const depthTexture = device.createTexture({
		size: [canvas.width, canvas.height],
		format: 'depth24plus',
		usage: GPUTextureUsage.RENDER_ATTACHMENT,
	});

	const uniformBufferSize = 4 * 16; // 4x4 matrix
	const uniformBuffer = device.createBuffer({
		size: uniformBufferSize,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	});

	const uniformBindGroup = device.createBindGroup({
		layout: pipeline.getBindGroupLayout(0),
		entries: [{ binding: 0, resource: uniformBuffer }],
	});

	const renderPassDescriptor = {
		colorAttachments: [
			{
				view: undefined, // Assigned later
				clearValue: { r: 0.13, g: 0.13, b: 0.13, a: 1.0 },
				loadOp: 'clear',
				storeOp: 'store',
			},
		],
		depthStencilAttachment: {
			view: depthTexture.createView(),
			depthClearValue: 1.0,
			depthLoadOp: 'clear',
			depthStoreOp: 'store',
		},
	};

	const projectionMatrix = mat4.perspective(FOV_Y, aspect, 1, 100.0);
	const modelViewProjectionMatrix = mat4.create();

	function getTransformationMatrix() {
		// ── Delta-time for smooth, frame-rate-independent movement ──────────
		const now = performance.now();
		const dt  = Math.min((now - lastTime) / 1000, 0.05); // cap at 50 ms
		lastTime  = now;

		// ── Integrate position ───────────────────────────────────────────────
		posX += velX * dt;
		posY += velY * dt;

		// ── Reflect off screen edges (symmetric reflection) ──────────────────
		if (posX > boundX) {
			posX = boundX - (posX - boundX); // push back inside
			velX = -Math.abs(velX);
		} else if (posX < -boundX) {
			posX = -boundX + (-boundX - posX);
			velX =  Math.abs(velX);
		}
		if (posY > boundY) {
			posY = boundY - (posY - boundY);
			velY = -Math.abs(velY);
		} else if (posY < -boundY) {
			posY = -boundY + (-boundY - posY);
			velY =  Math.abs(velY);
		}

		// ── Build view matrix ─────────────────────────────────────────────────
		// 1. Start from identity
		// 2. Translate camera back (z) AND shift cube in XY (screensaver offset)
		// 3. Spin the cube around a continuously changing axis
		const viewMatrix = mat4.identity();
		mat4.translate(viewMatrix, [posX, posY, -CAMERA_DIST], viewMatrix);

		const t = now / 1000;
		mat4.rotate(viewMatrix, [Math.sin(t), Math.cos(t), 0], 1, viewMatrix);

		mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
		return modelViewProjectionMatrix;
	}

	function frame() {
		const transformationMatrix = getTransformationMatrix();
		device.queue.writeBuffer(
			uniformBuffer,
			0,
			transformationMatrix.buffer,
			transformationMatrix.byteOffset,
			transformationMatrix.byteLength
		);

		renderPassDescriptor.colorAttachments[0].view = context
			.getCurrentTexture()
			.createView();

		const commandEncoder = device.createCommandEncoder();
		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
		passEncoder.setPipeline(pipeline);
		passEncoder.setBindGroup(0, uniformBindGroup);
		passEncoder.setVertexBuffer(0, verticesBuffer);
		passEncoder.draw(cubeVertexCount);
		passEncoder.end();
		device.queue.submit([commandEncoder.finish()]);

		requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);
}

init().catch(console.error);
