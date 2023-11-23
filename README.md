<div alt style="text-align: center;">
	<video alt="example" src="https://github.com/lichin-lin/tlidraw/raw/145d6635e233b55529a1ff09762c13a3cbd2790a/public/assets/tldraw.mp4">
</div>

This repo contains a very basic example of how to use [tldraw](https://github.com/tldraw/tldraw) in a [Next.js](https://nextjs.org/) app.

## Installation

- `yarn` to install all the dependencies

## Start the web server

- `yarn dev` to setup the frontend service with command

## Experiments

Here are some AI/Editing concept I am exploring, trigger different kinds of experiment with `Cmd + k` hotkey on the Mac.

#### 1. AI: Fast diffusion (Latent Consistency Model) [🔗](https://x.com/lichinlin/status/1725560340174282792?s=20)

1. You will need a real-time Latent Consistency Model python server (from ) for this experiment. follow the [instruction](https://github.com/radames/Real-Time-Latent-Consistency-Model) and setup the backend service (you will need to do a `git checkout ee4d659` to specifc version of the project).
2. Toggle the Command Menu (cmd + k) and select _Fast diffusion (Latent Consistency Model)_ to start the function
3. Try to draw an illustration inside the frame. the UI will send the doodle + frame name (as the prompt) to the backend to generate the result

#### 2. AI: remove background (client side only) [🔗](https://twitter.com/lichinlin/status/1682079536626937856)
1. Update a photo and click to select it
2. Toggle the Command Menu (cmd + k) and select *Remove background* to start the function
3. wait for 5-8 second, and you will get the result

#### 3. Editor: Linked list selection [🔗](https://x.com/lichinlin/status/1678312653708722177?s=20)
1. Create some stickys and connect them with connectors
2. Toggle the Command Menu (cmd + k) and select *Linked list selection* to start the function
3. Click to select the parent sticky and move it around
4. You will see that the children stickys update the position as well.

#### 4. Editor: Joystick control [🔗](https://x.com/lichinlin/status/1679802741542248451?s=20)
1. Create some stickys and connect them all to a single sticky with connectors
2. Toggle the Command Menu (cmd + k) and select *Joysticky control* to start the function
3. Click to select the parent sticky, and control the Joystick
4. You will see that the children stickys update their position.

#### 5. Editor: Crayon doodle [🔗](https://x.com/lichinlin/status/1680979372059275266?s=20)
1. Toggle the Command Menu (cmd + k) and select *Crayon effect* to start the function
2. Switch to doodle mode and start to draw on the canvas

#### 6. Editor: drag and drop [🔗](https://x.com/lichinlin/status/1689290497825570816?s=20)
1. Toggle the Command Menu (cmd + k) and select *sticker panel* to start the function
2. drag the sticker in the side panel and drop it on the canvas
