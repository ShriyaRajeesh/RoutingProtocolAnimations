# 🌐 Routing Protocol Animation — RIP, OSPF & EIGRP

This project visualizes how different **Routing Protocols** — **RIP**, **OSPF**, and **EIGRP** — operate in computer networks using interactive **React-based animations**.  
Each animation demonstrates how routers exchange routing information, build routing tables, and determine optimal paths for data transmission.

---

## 📘 Overview of Routing Protocols

### 1. RIP (Routing Information Protocol)
**Type:** Distance Vector Protocol  
**Metric Used:** Hop Count  
**Maximum Hop Count:** 15  
**Update Type:** Periodic (every 30 seconds)

#### 🔹 Working:
- Each router maintains a routing table with the distance (hop count) to reach every network.
- Routers exchange the entire table with neighbors periodically.
- If a route’s hop count exceeds 15, it’s considered unreachable.
- Uses the **Bellman-Ford algorithm** to calculate shortest paths.

#### 🔹 Key Features:
- Simple and easy to configure.
- Suitable for small networks.
- Converges slowly and prone to routing loops.

---

### 2. OSPF (Open Shortest Path First)
**Type:** Link State Protocol  
**Metric Used:** Cost (based on bandwidth)  
**Algorithm Used:** Dijkstra’s Shortest Path First  

#### 🔹 Working:
- Each router creates a **Link State Advertisement (LSA)** describing its directly connected links.
- LSAs are flooded throughout the network area.
- All routers build a **Link State Database (LSDB)**, identical across routers.
- Using Dijkstra’s algorithm, each router computes the **Shortest Path Tree (SPT)** and forms its routing table.

#### 🔹 Key Features:
- Fast convergence and efficient for large networks.
- Supports hierarchical routing via **areas**.
- Detects changes in topology quickly.

---

### 3. EIGRP (Enhanced Interior Gateway Routing Protocol)
**Type:** Hybrid (Distance Vector + Link State features)  
**Metric Used:** Composite (Bandwidth, Delay, Reliability, Load)  
**Algorithm Used:** Diffusing Update Algorithm (DUAL)

#### 🔹 Working:
- Routers maintain three tables:
  - **Neighbor Table** – Directly connected routers.
  - **Topology Table** – All possible routes learned.
  - **Routing Table** – Best paths selected using DUAL.
- Updates are **triggered** (not periodic), minimizing bandwidth use.
- Provides **loop-free and fast convergence** through DUAL computation.

#### 🔹 Key Features:
- Supports unequal-cost load balancing.
- Uses reliable transport protocol for communication.
- Faster than RIP and simpler than OSPF.

---

## ⚙️ Project Setup & Installation

### 🧩 Prerequisites
Make sure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)

### 🚀 Installation Steps

1. **Clone this repository**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   npm install
   npm start



