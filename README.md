<<<<<<< HEAD
# OSPF Routing Animation React Module



## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or above recommended)
- npm (comes with Node.js)

---

## Setup and Installation

1. **Clone or download this repository**

  - git clone <[repository-url](https://github.com/ShriyaRajeesh/shriyarajeesh_231IT069_AnimationOfRoutingLayerProtocols.git)>
  - cd <shriyarajeesh_231IT069_AnimationOfRoutingLayerProtocols.git>

2. **Install dependencies**

Navigate to the project folder and run:

npm install

3. **Start the development server**

Launch the application locally with:


This will start the app on `http://localhost:3000` by default.

---

## Usage

1. **Open the app in your browser**

Once the development server starts, navigate to `http://localhost:3000`.

2. **Input Link-State Advertisements (LSAs)**

- Use the input field under **"Enter LSA"** to add routers and their connections.  
  Example: `Router1:Router2=10,Router3=5` means Router1 connects to Router2 with cost 10 and Router3 with cost 5.
- Click **"Add Link"** to add this to the network topology.

3. **Set Source Router ID**

- Enter the Router ID you want to use as the source router for routing calculations in the **Source Router ID** input field.

4. **Compute Routing and Animate**

- Click the **"Run OSPF"** button.  
- The network topology graph will display, showing routers as nodes and connections as  edges.  
- Shortest path computations run using Dijkstra’s algorithm from the local router.  
- Animated orange packets will flow along the calculated shortest paths representing OSPF routing updates.

5. **Routing Table**

- The routing table appears showing the calculated lowest-cost routes from the selected local router to all others, with cost and next hop information.

---

## File Structure

- `src/components/OSPFRoutingAnimation.jsx`: Main React component with all logic and visualization.

=======
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
>>>>>>> bea3288c472568c357c220a21bc294ce37e1b5a9
