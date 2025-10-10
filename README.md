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

