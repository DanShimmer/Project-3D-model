# POLYVA 3D: AN AI-POWERED PLATFORM FOR AUTOMATED 3D MODEL GENERATION FROM TEXT AND IMAGE INPUTS

---

## ACKNOWLEDGMENTS

We would like to express our deepest gratitude to our thesis advisor for their invaluable guidance, constructive feedback, and unwavering support throughout the development of this project. Their expertise in the fields of artificial intelligence and software engineering has been instrumental in shaping both the direction and quality of this work.

We extend our sincere appreciation to the faculty members and lecturers who have imparted knowledge and skills that formed the foundation upon which this thesis was built. The courses in machine learning, computer graphics, web development, and software architecture all contributed directly to the realization of this project.

We are also grateful to Tencent's Hunyuan3D research team, Stability AI, and the broader open-source community whose publicly available models, libraries, and research papers made this work possible. The democratization of AI through open-source initiatives continues to push the boundaries of what individual researchers and developers can achieve.

Special thanks go to our peers and fellow students who provided feedback during the testing and evaluation phases. Their diverse perspectives helped us identify usability issues and improve the overall quality of the platform.

Finally, we would like to thank our families for their patience, encouragement, and emotional support during the demanding periods of this research and development process.

---

## ABSTRACT

The creation of three-dimensional digital models has traditionally been a labor-intensive process requiring specialized skills in 3D modeling software such as Blender, Maya, or 3ds Max. This process often takes hours or even days for a single model, creating a significant barrier to entry for individuals and small teams who lack the technical expertise or resources to produce high-quality 3D content.

This thesis presents **Polyva 3D**, a comprehensive web-based and desktop platform that leverages state-of-the-art artificial intelligence to automate the generation of 3D models from textual descriptions and two-dimensional images. The system integrates multiple deep learning models — including Stable Diffusion for text-to-image synthesis, Hunyuan3D-DiT for single-image-to-3D reconstruction, and ControlNet for geometry-aware texture generation — into a unified, end-to-end pipeline.

The platform is architected as a three-tier system: a React-based front-end with Three.js-powered 3D visualization, a Node.js/Express back-end serving as an API gateway, and a Python/Flask AI service orchestrating the machine learning pipeline. Beyond initial model generation, the system offers a complete post-processing suite including AI-driven texturing with PBR material support, algorithmic auto-rigging with Gaussian-weighted vertex skinning, procedural animation generation, topology remeshing, and multi-format export.

Experimental evaluation demonstrates that the system can produce usable 3D models in under five minutes, compared to hours of manual work, while maintaining acceptable geometric quality for applications in game development, rapid prototyping, and educational contexts. The platform supports deployment as a Progressive Web Application, an Electron-based desktop application, and a traditional web application, ensuring broad accessibility across different user environments.

**Keywords:** 3D model generation, text-to-3D, image-to-3D, diffusion models, Hunyuan3D, Stable Diffusion, auto-rigging, procedural animation, Three.js, deep learning, web application

---

## CHAPTER 1: INTRODUCTION

### 1.1. Background

The demand for three-dimensional digital content has grown exponentially in recent years, driven by the expansion of industries such as video game development, virtual reality (VR), augmented reality (AR), film and animation production, e-commerce product visualization, architectural visualization, and digital twin technology. According to market research, the global 3D modeling market was valued at approximately 6.6 billion USD in 2023 and is projected to reach over 15 billion USD by 2030, growing at a compound annual growth rate (CAGR) of around 12%.

Traditionally, creating 3D models requires proficiency in specialized software tools — such as Autodesk Maya, Blender, ZBrush, or 3ds Max — along with a deep understanding of concepts including polygon modeling, UV unwrapping, texturing, rigging, and animation. A skilled 3D artist may spend anywhere from several hours to multiple days creating a single production-ready model. This high barrier to entry, both in terms of skill requirements and time investment, has long been a bottleneck in content creation pipelines.

The rapid advancement of artificial intelligence, particularly in the domains of generative models and deep learning, has opened new possibilities for automating creative tasks that were previously the exclusive domain of human experts. The introduction of diffusion models — a class of generative models that learn to produce data by iteratively denoising random noise — has revolutionized image generation. Models such as Stable Diffusion, DALL-E, and Midjourney have demonstrated remarkable capabilities in generating high-quality images from textual descriptions.

More recently, researchers have extended these generative capabilities from two dimensions to three dimensions. Approaches such as Neural Radiance Fields (NeRF), Score Distillation Sampling (SDS), and direct 3D diffusion models have emerged as promising methods for automated 3D content creation. Among these, Tencent's Hunyuan3D represents a significant advancement by combining a flow-matching diffusion transformer with marching cubes mesh extraction to produce 3D geometry directly from a single input image.

This thesis explores the integration of these AI technologies into a practical, user-friendly platform that democratizes 3D content creation, making it accessible to users without specialized 3D modeling skills.

### 1.2. Problem Statement

Despite the remarkable progress in AI-based generative models, several critical challenges remain that prevent widespread adoption of automated 3D model generation:

**Fragmented Toolchain:** Current AI-based 3D generation tools exist primarily as isolated research prototypes or command-line scripts. Users must manually chain together multiple tools — image generators, 3D reconstructors, texture generators, rigging tools — each with different interfaces, data formats, and dependencies. This fragmentation creates a steep learning curve and an error-prone workflow.

**Quality Gap:** Raw outputs from AI 3D generation models often contain geometric artifacts such as disconnected mesh components, non-manifold edges, incorrect orientations, and missing textures. Bridging the gap between raw AI output and production-ready 3D assets requires significant post-processing expertise.

**Resource Constraints:** State-of-the-art 3D generation models require substantial computational resources, particularly GPU memory (VRAM). Many users do not have access to high-end hardware, and cloud-based solutions often lack the interactive, real-time feedback that creative workflows demand.

**Incomplete Pipeline:** Generating a usable 3D asset involves more than just creating geometry. A complete pipeline must also handle texturing (including PBR materials), rigging (skeleton creation and vertex weight assignment), animation, topology optimization, and export to industry-standard formats. No existing open-source solution provides all of these capabilities in a single, integrated platform.

**Accessibility:** Most existing AI 3D tools target technical users comfortable with Python environments, CUDA configurations, and command-line interfaces. There is a significant need for platforms that present these capabilities through intuitive graphical interfaces accessible to designers, educators, hobbyists, and other non-technical users.

### 1.3. Scope and Objectives

#### Scope

This thesis encompasses the design, implementation, and evaluation of a full-stack platform for AI-powered 3D model generation. The scope includes:

- **Text-to-3D generation**: Converting natural language descriptions into 3D mesh models through an intermediate text-to-image stage followed by image-to-3D reconstruction.
- **Image-to-3D generation**: Converting user-uploaded 2D images directly into 3D mesh models.
- **AI-driven texturing**: Applying realistic or stylized textures to generated models using ControlNet-guided diffusion.
- **Automated rigging**: Creating bone skeletons and computing vertex skin weights for both humanoid and quadruped models.
- **Procedural animation**: Generating animation keyframes for common actions such as walking, running, attacking, and dancing.
- **Topology optimization**: Converting between triangle and quad mesh topologies at configurable quality levels.
- **Multi-format export**: Supporting industry-standard formats including GLB, FBX, OBJ, STL, USDZ, and BLEND.
- **Cross-platform deployment**: Delivering the application as a web application, Progressive Web Application (PWA), and desktop application via Electron.

#### Objectives

1. To design and implement an end-to-end pipeline that integrates multiple AI models into a seamless 3D content creation workflow.
2. To develop an intuitive user interface that abstracts the complexity of the underlying AI systems, enabling non-technical users to generate 3D models.
3. To implement post-processing algorithms that improve the quality of AI-generated meshes to a level suitable for practical applications.
4. To create an automated rigging system that uses geometric analysis and Gaussian-weighted vertex skinning to produce animatable models.
5. To evaluate the system's performance in terms of generation time, mesh quality, and usability.
6. To deploy the system as a cross-platform application accessible via web browsers and desktop environments.

### 1.4. Assumptions and Solutions

#### Assumptions

1. **Hardware Availability:** The AI service is assumed to run on a machine equipped with an NVIDIA GPU with at least 8 GB of VRAM, though the system includes adaptive optimizations for different hardware tiers and a CPU fallback mode.
2. **Network Connectivity:** The initial setup requires internet access to download pre-trained model weights from Hugging Face repositories. Subsequent operations can function offline.
3. **Input Quality:** For image-to-3D generation, the system assumes that input images depict a single, clearly visible object with reasonable contrast against the background.
4. **Model Complexity:** The generated 3D models are targeted at medium complexity (up to 100,000 polygons), suitable for real-time applications such as games and AR/VR rather than film-quality rendering.
5. **User Base:** The target users are individuals with basic computer literacy but not necessarily expertise in 3D modeling or AI systems.

#### Solutions

To address the identified problems, the following solutions are proposed:

1. **Unified Platform Architecture:** A three-tier architecture (front-end, back-end, AI service) that integrates all tools into a single platform with a consistent user interface and automated data flow between pipeline stages.
2. **Adaptive GPU Management:** A dynamic GPU optimizer that detects available VRAM and adjusts model configurations, resolutions, and memory management strategies accordingly, ensuring the system operates across a range of hardware capabilities.
3. **Multi-Stage Post-Processing:** A comprehensive post-processing pipeline including disconnected component removal, Taubin volume-preserving smoothing, quadric edge collapse decimation, automatic orientation correction, and mesh repair to transform raw AI outputs into clean, usable meshes.
4. **Algorithmic Auto-Rigging:** A geometry-driven rigging system that uses bounding box analysis for joint placement and point-to-segment Gaussian falloff for smooth vertex weight computation, eliminating the need for manual weight painting.
5. **Graceful Degradation:** A multi-tier fallback system where each pipeline stage has alternative execution paths — from high-quality AI processing to procedural fallbacks — ensuring the system always produces output regardless of available computational resources.

### 1.5. Structure of Thesis

This thesis is organized into six chapters:

- **Chapter 1 — Introduction:** Provides the background, problem statement, scope, objectives, and assumptions that motivate this research.
- **Chapter 2 — Literature Review:** Surveys the theoretical foundations and related work in 3D model generation, diffusion models, mesh processing, auto-rigging, and web-based 3D visualization.
- **Chapter 3 — Methodology:** Describes the system architecture, design decisions, algorithms, and tools used in the development of the platform.
- **Chapter 4 — Evaluation and Results:** Details the implementation of each system component and presents the results of the generation pipeline.
- **Chapter 5 — Discussion and Evaluation:** Analyzes the results, evaluates the system against its objectives, and discusses limitations.
- **Chapter 6 — Conclusion and Future Work:** Summarizes the contributions of this thesis and outlines directions for future research and development.

---

## CHAPTER 2: LITERATURE REVIEW

### 2.1. Overview of 3D Model Representation

Three-dimensional models are fundamental to computer graphics and can be represented in several ways, each with distinct advantages depending on the application context.

#### 2.1.1. Mesh-Based Representations

The most common representation in real-time applications is the **polygon mesh**, which defines a 3D surface as a collection of vertices, edges, and faces (typically triangles or quadrilaterals). The advantages of mesh-based representations include:

- **Efficiency:** GPU hardware is optimized for rasterizing triangles, making polygon meshes ideal for real-time rendering.
- **Editability:** Artists can directly manipulate vertices, edges, and faces to modify shapes.
- **Industry Standard:** Formats such as glTF/GLB, FBX, OBJ, and STL are universally supported across 3D software ecosystems.

However, mesh quality is critical. Issues such as non-manifold geometry (edges shared by more than two faces), T-junctions (vertices on edges but not at endpoints), degenerate faces (zero-area triangles), and disconnected components can cause problems in downstream applications including rendering artifacts, physics simulation errors, and rigging failures.

#### 2.1.2. Implicit Representations

Implicit surfaces define geometry as the zero level-set of a continuous function $f: \mathbb{R}^3 \rightarrow \mathbb{R}$, where $f(\mathbf{x}) = 0$ defines the surface. Neural implicit representations, such as Neural Radiance Fields (NeRF) and occupancy networks, use neural networks to learn this function. The key advantage is that implicit representations are resolution-independent and can represent complex topologies. The **marching cubes** algorithm is the standard method for extracting explicit mesh surfaces from implicit fields, operating on a voxel grid where each cube's vertex sign pattern determines the local surface topology.

#### 2.1.3. Point Cloud Representations

Point clouds represent surfaces as unstructured sets of 3D points, optionally with normals and colors. While useful as intermediate representations (e.g., from depth sensors or as diffusion model outputs), point clouds lack connectivity information and must be converted to meshes for most applications through surface reconstruction algorithms such as Poisson reconstruction or ball pivoting.

### 2.2. Generative AI for Image Synthesis

#### 2.2.1. Diffusion Models

Diffusion models have emerged as the dominant paradigm in generative AI for image synthesis. The fundamental principle involves two processes:

**Forward Process (Diffusion):** Gradually adds Gaussian noise to data over $T$ timesteps according to a variance schedule $\{\beta_t\}_{t=1}^{T}$:

$$q(\mathbf{x}_t | \mathbf{x}_{t-1}) = \mathcal{N}(\mathbf{x}_t; \sqrt{1-\beta_t}\mathbf{x}_{t-1}, \beta_t\mathbf{I})$$

**Reverse Process (Denoising):** A neural network $\epsilon_\theta$ learns to reverse the diffusion process, predicting and removing noise at each step:

$$p_\theta(\mathbf{x}_{t-1} | \mathbf{x}_t) = \mathcal{N}(\mathbf{x}_{t-1}; \mu_\theta(\mathbf{x}_t, t), \sigma_t^2\mathbf{I})$$

The training objective minimizes the mean squared error between predicted and actual noise:

$$\mathcal{L} = \mathbb{E}_{t, \mathbf{x}_0, \epsilon}\left[\|\epsilon - \epsilon_\theta(\mathbf{x}_t, t)\|^2\right]$$

#### 2.2.2. Stable Diffusion

Stable Diffusion, developed by Stability AI in collaboration with CompVis and Runway, operates in a compressed **latent space** rather than pixel space, dramatically reducing computational requirements. The architecture consists of three key components:

- **Variational Autoencoder (VAE):** Compresses images from pixel space ($512 \times 512 \times 3$) to a latent space ($64 \times 64 \times 4$) and decodes latents back to images.
- **U-Net Denoiser:** A convolutional neural network with cross-attention layers that performs the iterative denoising in latent space.
- **Text Encoder (CLIP):** Transforms text prompts into embedding vectors that condition the U-Net via cross-attention, enabling text-guided image generation.

Stable Diffusion version 1.5 (approximately 1 billion parameters) operates at 512×512 resolution, while Stable Diffusion XL (approximately 3.5 billion parameters) supports up to 1024×1024 resolution with improved prompt adherence and image quality.

#### 2.2.3. ControlNet

ControlNet, proposed by Zhang and Agrawala (2023), extends diffusion models with additional conditioning inputs such as depth maps, edge maps, or pose skeletons. It works by creating a trainable copy of the U-Net's encoder blocks and connecting them to the frozen main model via zero-convolution layers. This architecture allows the model to generate images that adhere to specific spatial structures while maintaining the original model's generative quality.

In the context of this thesis, ControlNet with depth conditioning is used to generate textures that conform to the 3D geometry of generated models, ensuring that texture patterns follow the surface contours rather than appearing as flat projections.

### 2.3. 3D Generation from Single Images

#### 2.3.1. Neural Radiance Fields (NeRF)

Neural Radiance Fields, introduced by Mildenhall et al. (2020), represent scenes as continuous volumetric functions that map 3D coordinates and viewing directions to color and density values. While revolutionary for novel view synthesis, NeRF has limitations for 3D model generation: it requires multiple input views, produces volumetric representations rather than meshes, and has slow training and inference times.

#### 2.3.2. Score Distillation Sampling (SDS)

DreamFusion (Poole et al., 2022) introduced Score Distillation Sampling, which uses a pre-trained 2D diffusion model as a critic to optimize a 3D representation (NeRF) such that its rendered views score well under the diffusion model. While innovative, SDS-based methods suffer from the "Janus problem" (multi-face artifacts), slow optimization (30+ minutes per model), and the "over-saturation" problem where colors become unnaturally vivid.

#### 2.3.3. Direct 3D Diffusion Models

More recent approaches directly train diffusion models on 3D data. **Hunyuan3D**, developed by Tencent, represents a significant advancement in this direction. The Hunyuan3D-DiT (Diffusion Transformer) model uses:

- **Flow Matching:** A continuous-time formulation of diffusion that learns velocity fields along optimal transport paths between noise and data distributions. This approach offers more stable training and faster inference compared to discrete-timestep diffusion.
- **Diffusion Transformer (DiT) Architecture:** Replaces the traditional U-Net with a Transformer architecture that processes 3D shape tokens, enabling better global shape reasoning.
- **Marching Cubes Extraction:** Converts the generated implicit field into an explicit triangle mesh using the marching cubes algorithm with octree acceleration at resolution 380.
- **FlashVDM (Variational Diffusion Model):** A turbo mode that generates shapes in as few as 5 inference steps while maintaining quality, representing a 10× speedup over standard 50-step inference.

The Hunyuan3D model with 1.1 billion parameters can generate a complete 3D shape from a single image in approximately 30-60 seconds on consumer GPU hardware.

### 2.4. Mesh Processing and Optimization

#### 2.4.1. Mesh Smoothing

Raw meshes generated by AI models often contain surface noise and artifacts. Smoothing algorithms reduce these imperfections:

- **Laplacian Smoothing:** Moves each vertex toward the centroid of its neighbors. While effective at noise removal, it causes progressive **volume shrinkage** — the mesh gradually contracts with each iteration.
- **Taubin Smoothing:** Addresses the volume shrinkage problem by alternating two passes: a forward pass with positive factor $\lambda$ (smoothing) and a backward pass with negative factor $\mu$ (inflation), where $|\mu| > \lambda$. This produces a **volume-preserving** smooth that removes high-frequency noise while maintaining the overall shape.

#### 2.4.2. Mesh Decimation

Polygon reduction is essential for real-time applications. The **Quadric Error Metric (QEM)** method, introduced by Garland and Heckbert (1997), assigns a quadric error matrix to each vertex representing the sum of squared distances to its adjacent planes. Edge collapse operations are prioritized by minimizing the resulting quadric error, producing meshes that preserve geometric features while drastically reducing face count.

#### 2.4.3. Mesh Repair

Common mesh defects require automated repair:

- **Non-manifold edge removal:** Edges shared by more than two faces are resolved by duplicating shared vertices.
- **Hole filling:** Boundary loops (sequences of edges with only one adjacent face) are triangulated to close gaps, typically using ear-clipping or advancing-front methods.
- **Degenerate face removal:** Triangles with zero or near-zero area are collapsed or removed.
- **Vertex welding:** Vertices within a tolerance distance are merged to eliminate seams and duplicates.

### 2.5. Skeletal Animation and Auto-Rigging

#### 2.5.1. Skeleton-Based Animation

Skeletal animation is the standard technique for animating articulated characters in real-time applications. A **skeleton** consists of a hierarchy of bones (joints connected by parent-child relationships). Each bone has a local transformation (translation, rotation, scale) relative to its parent, and the global transformation of any bone is computed by concatenating transformations up the hierarchy.

#### 2.5.2. Linear Blend Skinning (LBS)

Linear Blend Skinning is the most widely used method for deforming a mesh according to skeleton motion. Each vertex $\mathbf{v}$ is influenced by up to $k$ bones (typically $k = 4$ for glTF compatibility), and its deformed position is:

$$\mathbf{v}' = \sum_{j=1}^{k} w_j \cdot \mathbf{M}_j \cdot \mathbf{v}$$

where $w_j$ is the skin weight for bone $j$ (with $\sum w_j = 1$) and $\mathbf{M}_j$ is the combined transformation matrix of bone $j$. The quality of the deformation depends critically on the accuracy of the skin weights.

#### 2.5.3. Automated Weight Computation

Traditional auto-rigging approaches include:

- **Heat Diffusion Weights:** Proposed by Baran and Popović (2007) in the Pinocchio system, this method computes weights by solving a heat diffusion equation on the mesh, treating bones as heat sources. The resulting weights are smooth and respect the mesh topology but require solving a large linear system.
- **Geodesic Voxel Binding:** Used by Autodesk Maya, this approach computes weights based on geodesic distances within a voxelized representation of the mesh.
- **Distance-Based Weights:** Simpler methods compute weights based on Euclidean or point-to-segment distances with falloff functions. While less topologically accurate than heat diffusion, these methods are significantly faster and can be enhanced with post-processing smoothing.

### 2.6. Web-Based 3D Visualization

#### 2.6.1. WebGL and Three.js

WebGL (Web Graphics Library) provides a JavaScript API for rendering interactive 2D and 3D graphics within web browsers without plugins. **Three.js** is the most widely adopted high-level wrapper around WebGL, providing abstractions for scenes, cameras, lights, materials, geometries, and post-processing effects.

#### 2.6.2. React Three Fiber

React Three Fiber is a React renderer for Three.js that allows 3D scenes to be described declaratively using JSX components. This approach integrates 3D rendering seamlessly into React's component lifecycle, state management, and event system, enabling complex 3D visualizations to be built with the same patterns used for 2D user interfaces.

#### 2.6.3. glTF/GLB Format

The GL Transmission Format (glTF), developed by the Khronos Group, has become the de facto standard for transmitting 3D models on the web. GLB (Binary glTF) packages geometry, materials, textures, animations, and skeleton data into a single binary file. Its features include support for PBR (Physically-Based Rendering) materials, skeletal animations with multiple channels, morph targets, and an extensible architecture.

### 2.7. Heuristic Analysis in 3D Processing

Heuristic methods play a crucial role in several aspects of the 3D model generation pipeline where exact solutions are either computationally infeasible or ill-defined:

#### 2.7.1. Automatic Orientation Detection

Determining the correct "upright" orientation of a generated 3D model is an inherently ambiguous problem. Heuristic approaches analyze geometric properties — such as the distribution of cross-sectional areas along each axis, the position of the center of mass, and the symmetry profile — to infer the most likely orientation. In this system, a 10-slice cross-sectional analysis computes a weighted center-of-spread metric: if the bottom half is heavier (center < 0.45), the model is already upright; otherwise, it is flipped.

#### 2.7.2. Prompt Classification and Enhancement

Translating user prompts into effective inputs for diffusion models requires heuristic keyword analysis. The system classifies prompts into categories (character, vehicle, weapon, etc.) using pattern matching and then appends category-specific quality descriptors and 3D-optimized modifiers. This heuristic approach to prompt engineering significantly improves the quality and consistency of generated images for downstream 3D reconstruction.

#### 2.7.3. Bone Placement Heuristics

Automated skeleton creation uses heuristic rules based on the model's bounding box proportions. For humanoid characters, joint positions are defined as proportional fractions of the bounding box height (e.g., hips at 50%, knees at 27%, shoulders at 80%), derived from anthropometric studies. For quadruped models, the body is divided proportionally along the Z-axis (length) with leg positions determined by width-based offsets.

### 2.8. API Integration and Microservice Architecture

Modern web applications increasingly adopt microservice architectures where distinct functionalities are implemented as independent services communicating via APIs. This approach offers several advantages:

- **Technology Heterogeneity:** Different services can use the most appropriate technology stack. In this system, the AI service uses Python (for ML library compatibility) while the web backend uses Node.js (for web serving performance).
- **Independent Scaling:** The computationally intensive AI service can be scaled independently from the web-serving backend.
- **Fault Isolation:** Failures in one service do not cascade to others; the system implements graceful degradation where the web application remains functional even if the AI service is unavailable.
- **Development Velocity:** Teams can work on different services independently with well-defined API contracts.

The RESTful API pattern, using HTTP methods (GET, POST, PUT, DELETE) mapped to CRUD operations on resources, provides a consistent and well-understood interface between services.

---

## CHAPTER 3: METHODOLOGY

### 3.1. Overview

The Polyva 3D platform is designed as a modular, three-tier system that separates concerns between user interaction, business logic, and AI processing. The development follows an iterative methodology, with each system component developed and tested incrementally before integration.

The overall workflow from the user's perspective is:

1. The user provides a text prompt or uploads an image through the web interface.
2. The front-end sends the request to the back-end API gateway.
3. The back-end forwards the request to the AI service.
4. The AI service orchestrates the ML pipeline (text-to-image → preprocessing → 3D generation → post-processing).
5. The generated 3D model is returned to the front-end and rendered in an interactive 3D viewer.
6. The user can then apply additional processing: texturing, rigging, animation, remeshing, and export.

### 3.2. Design Considerations

#### 3.2.1. Separation of Concerns

The system strictly separates the presentation layer (React front-end), business logic layer (Node.js back-end), and AI processing layer (Python AI service). This separation allows each layer to evolve independently, use the most appropriate technology stack, and be deployed on different hardware as needed.

#### 3.2.2. Adaptive Resource Management

GPU memory is a critical bottleneck in AI-based 3D generation. The system implements a dynamic GPU optimizer that detects available VRAM at startup and adjusts configurations across three tiers:

- **High tier (12+ GB VRAM):** Full resolution, FP16 precision, xformers memory-efficient attention, torch.compile optimization.
- **Medium tier (8-11 GB VRAM):** Full resolution with attention slicing, VAE slicing, and CPU offloading for large models.
- **Low tier (under 8 GB VRAM):** Reduced resolution, all memory optimizations enabled, VAE tiling, aggressive CPU offloading.
- **CPU fallback:** FP32 precision, minimal resolution, reduced inference steps.

Additionally, the system employs **sequential model loading** — the Stable Diffusion model is fully unloaded from GPU memory before the Hunyuan3D model is loaded — because both models cannot coexist in the typical 12 GB VRAM found in consumer GPUs.

#### 3.2.3. Graceful Degradation

Every stage in the pipeline implements fallback mechanisms:

- **Texturing:** AI-driven (Stable Diffusion + ControlNet) → simplified AI (synthetic depth) → procedural gradient textures.
- **Background removal:** Hunyuan3D built-in → rembg library → pass-through.
- **Smoothing:** Taubin volume-preserving → Laplacian → skip.
- **Decimation:** PyMeshLab quadric → trimesh simplification → skip.
- **Thumbnail rendering:** PyRender → painter's algorithm software rendering → None.
- **Database:** Cloud MongoDB → local MongoDB → in-memory MongoDB.

This multi-tier fallback design ensures the system always produces output, trading quality for availability when resources are constrained.

#### 3.2.4. Asynchronous Processing

3D model generation is a time-intensive operation (typically 2-5 minutes). The system uses asynchronous job processing with a polling-based architecture:

1. The client submits a generation request and receives a job identifier immediately.
2. The AI service processes the request in a background thread.
3. The client polls the job status endpoint at regular intervals (every 3 seconds).
4. Each poll response includes the current processing stage and progress percentage.
5. Upon completion, the poll response includes the URL of the generated model file.

This approach prevents HTTP timeouts, provides real-time progress feedback, and allows the user interface to remain responsive during generation.

#### 3.2.5. Security and Authentication

The system implements a two-factor authentication flow:

1. **Credentials verification:** Email and password are validated against the database (bcrypt-hashed passwords with salt rounds of 10).
2. **OTP verification:** A 6-digit one-time password is sent to the user's email and must be entered within a time window (5-10 minutes).
3. **Token-based sessions:** Upon successful authentication, a JSON Web Token (JWT) with a 7-day expiry is issued and used for subsequent API requests.

### 3.3. Environment and Tools

#### 3.3.1. Development Environment

| Component | Technology | Version |
|-----------|-----------|---------|
| Front-end framework | React | 18.x |
| Build tool | Vite | 4.x |
| 3D rendering | Three.js via React Three Fiber | 0.160 |
| Styling | Tailwind CSS | 3.x |
| Animation | Framer Motion | — |
| Desktop framework | Electron | 28.x |
| Back-end runtime | Node.js with TypeScript | ES2020 |
| Web framework (back-end) | Express | 4.18 |
| Database | MongoDB via Mongoose | 7.x |
| AI service framework | Flask (Python) | — |
| Deep learning framework | PyTorch with CUDA | — |
| 3D processing | trimesh, PyMeshLab, NumPy | — |
| Image processing | Pillow (PIL), rembg | — |
| ML model hosting | Hugging Face Hub | — |

#### 3.3.2. AI Models

| Model | Provider | Parameters | Function |
|-------|----------|------------|----------|
| Stable Diffusion 1.5 | RunwayML | ~1 billion | Fast text-to-image generation |
| Stable Diffusion XL | Stability AI | ~3.5 billion | High-quality text-to-image generation |
| Hunyuan3D-DiT v2 | Tencent | 1.1 billion | Single-image to 3D shape reconstruction |
| Hunyuan3D-Paint | Tencent | 1.3 billion | UV-mapped texture synthesis |
| ControlNet Depth | lllyasviel | ~400 million | Geometry-conditioned image generation |
| DPT-Large | Intel | ~300 million | Monocular depth estimation |
| U2-Net (via rembg) | — | — | Salient object detection for background removal |

#### 3.3.3. Hardware Requirements

The system is designed to operate across different hardware configurations:

- **Recommended:** NVIDIA GPU with 12+ GB VRAM (e.g., RTX 3060, RTX 4070)
- **Minimum GPU:** NVIDIA GPU with 8 GB VRAM (with reduced quality settings)
- **CPU-only mode:** Supported with significantly longer generation times
- **RAM:** 16 GB minimum, 32 GB recommended
- **Storage:** At least 20 GB for model weights and cache

### 3.4. System Design

#### 3.4.1. High-Level Architecture

The system follows a three-tier architecture:

**Tier 1 — Presentation Layer (Front-End):**
The React-based front-end handles all user interactions, 3D model visualization, and client-side state management. It communicates with the back-end exclusively through RESTful API calls. The front-end can be deployed as a web application, a PWA (Progressive Web Application) with offline capabilities, or a desktop application via Electron.

**Tier 2 — Business Logic Layer (Back-End):**
The Node.js/Express back-end serves as an API gateway and business logic processor. It handles user authentication, model management (CRUD operations), file serving, and acts as a proxy between the front-end and AI service. The back-end manages the MongoDB database for persistent storage of user accounts and model metadata.

**Tier 3 — AI Processing Layer (AI Service):**
The Python/Flask AI service encapsulates all machine learning operations. It manages GPU resources, loads and unloads ML models as needed, orchestrates the multi-stage generation pipeline, and handles all 3D mesh processing operations including post-processing, texturing, rigging, animation, and remeshing.

#### 3.4.2. Data Flow

**Text-to-3D Generation Flow:**

1. User enters text prompt → Front-end sends POST request to back-end.
2. Back-end validates authentication and forwards request to AI service.
3. AI service enhances the prompt with category-specific modifiers.
4. Enhanced prompt is fed to Stable Diffusion to generate a reference image.
5. The reference image undergoes preprocessing (background removal, resizing).
6. The preprocessed image is input to Hunyuan3D-DiT for 3D shape generation.
7. The raw mesh undergoes post-processing (cleanup, smoothing, decimation, orientation correction).
8. The final mesh is exported as GLB and a thumbnail is rendered.
9. The GLB file URL is returned through the back-end to the front-end.
10. The front-end loads and renders the 3D model in the interactive viewer.

**Image-to-3D Generation Flow:**

Steps 1-2 are similar but include a multipart file upload. Steps 3-4 are skipped (the user's image replaces the AI-generated image). Steps 5-10 proceed identically.

**Phase 2 Processing Flow:**

After initial generation, the user can apply additional processing through the Phase 2 pipeline:

- **Texturing:** The GLB model is sent to the AI service, which renders depth maps from 6 viewpoints, generates textures via ControlNet-guided Stable Diffusion, composites them into a texture atlas, and projects them onto UV coordinates.
- **Rigging:** The AI service analyzes the mesh bounding box, creates a skeleton hierarchy, computes vertex skin weights using Gaussian-weighted distance, and embeds the skeleton and weights into the GLB file.
- **Animation:** Procedural keyframes are generated for the selected animation type and applied to the rigged skeleton. The animation data is embedded into the GLB file's animation channels.

#### 3.4.3. Database Schema

The MongoDB database stores two primary collections:

**Users Collection:**
- Authentication credentials (email, bcrypt-hashed password)
- Verification status (email verified, admin flag, blocked status)
- Profile data (display name, avatar identifier)
- OTP management (code, expiry timestamp)
- Activity tracking (last login timestamp)

**Models Collection:**
- Ownership reference (user ID foreign key)
- Model metadata (name, type, prompt, source image URL)
- File references (GLB URL, thumbnail URL)
- Classification (demo model category, variant index)
- Sharing state (shared flag, share token)
- Indexed on user ID and creation timestamp for efficient queries

### 3.5. Algorithms

#### 3.5.1. Prompt Enhancement Algorithm

The prompt enhancement algorithm transforms user-provided natural language descriptions into optimized prompts for the Stable Diffusion model. The algorithm operates in several stages:

**Category Classification:** The input prompt is scanned for keywords associated with predefined categories. Each category has a set of trigger words (e.g., "human," "character," "person" for the character category; "car," "vehicle," "truck" for the vehicle category). The first matching category determines the enhancement strategy.

**Quality Descriptor Injection:** Category-specific quality descriptors are prepended to the prompt. For example, character prompts receive descriptors emphasizing "full body, T-pose, centered, symmetric, clean topology," while vehicle prompts receive "detailed mechanical parts, smooth surfaces, proper proportions."

**3D-Optimized Modifiers:** Universal 3D modifiers are appended: "3D model, isometric view, studio lighting, white background, high detail, clean geometry." These modifiers bias the diffusion model toward generating images that are more suitable for 3D reconstruction — particularly single objects on clean backgrounds viewed from informative angles.

**Negative Prompt Engineering:** A carefully crafted negative prompt blocks undesirable features: "background, ground, shadows, environment, multiple objects, flat, 2D, sketch, thin structures, text, watermark." Each element addresses a specific failure mode in downstream 3D reconstruction.

#### 3.5.2. Background Removal and Preprocessing

The preprocessing pipeline prepares the 2D image for 3D reconstruction:

**Background Removal:** The U2-Net architecture (a nested U-structure with residual blocks) segments the salient object from the background, producing an alpha matte. The original image is composited with this matte to create an RGBA image with transparent background.

**Foreground Extraction and Padding:** The alpha channel's bounding box is computed to identify the foreground region. The foreground is cropped and placed within a square canvas with controlled padding. The padding ratio (85% fill) ensures the object occupies most of the frame while leaving sufficient margin for the 3D model to project without clipping. The sizing formula ensures the object is centered with uniform border spacing.

**View Selection:** When multi-view images are generated (six viewpoints: front, back, left, right, top, three-quarter), the system selects the optimal view for 3D reconstruction. The priority order is: three-quarter view (provides the most 3D geometric information) → front view → side views → other views.

#### 3.5.3. Gaussian-Weighted Vertex Skinning

The auto-rigging algorithm computes skin weights using a point-to-segment distance with Gaussian falloff. For each vertex $\mathbf{P}$ and each bone segment defined by endpoints $\mathbf{A}$ (head) and $\mathbf{B}$ (tail):

**Step 1 — Point-to-Segment Distance Calculation:**

The closest point on the bone segment to the vertex is found by projecting the vertex onto the bone line and clamping the parameter to the segment:

$$t = \text{clamp}\left(\frac{(\mathbf{P} - \mathbf{A}) \cdot (\mathbf{B} - \mathbf{A})}{|\mathbf{B} - \mathbf{A}|^2}, 0, 1\right)$$

$$\mathbf{C} = \mathbf{A} + t \cdot (\mathbf{B} - \mathbf{A})$$

$$d = |\mathbf{P} - \mathbf{C}|$$

**Step 2 — Gaussian Falloff:**

The raw weight is computed using a Gaussian function:

$$w = \exp\left(-\frac{d^2}{2\sigma^2}\right)$$

where $\sigma$ is the average bone length multiplied by a spread factor of 1.0. This creates a smooth bell-curve influence zone around each bone.

**Step 3 — Power Sharpening:**

The weights are raised to the 5th power ($w^5$) to sharpen the influence boundaries. This ensures that vertices near a bone have significantly higher weights than those farther away, reducing unwanted cross-influence between distant bones.

**Step 4 — Nearest-Bone Boost:**

For each vertex, the geometrically closest bone receives a 25× multiplier. This heuristic ensures that every vertex is strongly associated with at least one bone, preventing "floating" vertices that might not deform correctly during animation.

**Step 5 — Top-K Selection and Normalization:**

Only the top 4 bone influences are retained per vertex (as required by the glTF specification for the JOINTS_0 and WEIGHTS_0 attributes). The selected weights are normalized to sum to 1.0.

**Step 6 — Laplacian Weight Smoothing:**

A post-processing pass smooths the weights across the mesh surface using the mesh adjacency graph. For each vertex, the new weight vector is a blend of the original and the average of its neighbors:

$$\mathbf{w}_i' = (1 - \alpha) \cdot \mathbf{w}_i + \alpha \cdot \frac{1}{|N(i)|} \sum_{j \in N(i)} \mathbf{w}_j$$

where $\alpha = 0.15$ is the smoothing strength and $N(i)$ is the set of vertices adjacent to vertex $i$. This process runs for 2 iterations, eliminating discontinuities that would cause visible seams during animation.

**Step 7 — Vertex Welding:**

Co-located vertices (common at UV seams in exported meshes) are identified by grouping vertices with positions matching to 5 decimal places. All vertices in each group are assigned the same averaged weights, preventing visible tearing at seams during deformation.

#### 3.5.4. Procedural Animation Generation

The animation system generates keyframe-based animations by defining rotation curves for each bone over a 24-frame cycle. The animations are designed using anatomically motivated sinusoidal functions:

**Walk Cycle:** The walk animation uses phase-offset sinusoidal functions for bilateral symmetry:

- **Legs:** $\theta_{\text{thigh}}(t) = A \sin(2\pi f t)$ where $A = 0.35$ radians for the stride amplitude.
- **Counter-rotation:** The upper body rotates opposite to the legs: $\theta_{\text{spine}}(t) = -0.5 \cdot \theta_{\text{hip}}(t)$ to maintain balance.
- **Knee bend:** Applied on the backswing phase to simulate the natural gait cycle.
- **Hip bounce:** A vertical translation channel with frequency double the stride: $y(t) = h \cdot |\sin(2\pi \cdot 2f \cdot t)|$ simulating the up-down motion of walking.

**Euler to Quaternion Conversion:** All rotations are converted from Euler angles (intuitive for animation design) to quaternions (required by glTF) using the standard conversion:

$$q_w = \cos\frac{\phi}{2}\cos\frac{\theta}{2}\cos\frac{\psi}{2} + \sin\frac{\phi}{2}\sin\frac{\theta}{2}\sin\frac{\psi}{2}$$

$$q_x = \sin\frac{\phi}{2}\cos\frac{\theta}{2}\cos\frac{\psi}{2} - \cos\frac{\phi}{2}\sin\frac{\theta}{2}\sin\frac{\psi}{2}$$

$$q_y = \cos\frac{\phi}{2}\sin\frac{\theta}{2}\cos\frac{\psi}{2} + \sin\frac{\phi}{2}\cos\frac{\theta}{2}\sin\frac{\psi}{2}$$

$$q_z = \cos\frac{\phi}{2}\cos\frac{\theta}{2}\sin\frac{\psi}{2} - \sin\frac{\phi}{2}\sin\frac{\theta}{2}\cos\frac{\psi}{2}$$

where $\phi$, $\theta$, and $\psi$ are the rotation angles around the X, Y, and Z axes respectively.

#### 3.5.5. Taubin Volume-Preserving Smoothing

The post-processing pipeline employs Taubin smoothing to reduce surface noise without shrinking the mesh. The algorithm alternates between two Laplacian smoothing passes:

**Shrinking Pass (factor $\lambda > 0$):**

$$\mathbf{v}_i \leftarrow \mathbf{v}_i + \lambda \cdot \mathcal{L}(\mathbf{v}_i)$$

**Inflating Pass (factor $\mu < 0$, where $|\mu| > \lambda$):**

$$\mathbf{v}_i \leftarrow \mathbf{v}_i + \mu \cdot \mathcal{L}(\mathbf{v}_i)$$

where $\mathcal{L}(\mathbf{v}_i) = \frac{1}{|N(i)|}\sum_{j \in N(i)} \mathbf{v}_j - \mathbf{v}_i$ is the discrete Laplacian operator. The combination of shrinking and inflating passes acts as a band-pass filter, removing high-frequency noise (small surface bumps) while preserving low-frequency features (overall shape).

#### 3.5.6. Quadric Error Metric Decimation

The system uses the Quadric Error Metric (QEM) for mesh simplification. Each vertex $\mathbf{v}$ is associated with a quadric matrix $\mathbf{Q}$ that encodes the sum of squared distances to its adjacent planes:

$$\mathbf{Q}_v = \sum_{p \in \text{planes}(v)} \mathbf{K}_p$$

where $\mathbf{K}_p = \mathbf{p}\mathbf{p}^T$ for plane vector $\mathbf{p} = [a, b, c, d]^T$ (plane equation $ax + by + cz + d = 0$).

When an edge $(\mathbf{v}_1, \mathbf{v}_2)$ is collapsed, the error at the optimal position is $\bar{\mathbf{v}}^T(\mathbf{Q}_1 + \mathbf{Q}_2)\bar{\mathbf{v}}$. Edges are collapsed in order of increasing error, preserving geometric features where the error would be highest.

#### 3.5.7. Automatic Orientation Detection

The orientation detection algorithm determines whether a generated 3D model needs to be flipped upright:

1. The model's bounding box along the Y-axis (assumed vertical) is divided into 10 equal slices.
2. For each slice, the cross-sectional spread (standard deviation of vertex positions in X and Z) is computed.
3. A weighted center-of-spread metric is calculated: $C = \frac{\sum_i i \cdot s_i}{\sum_i s_i}$ where $s_i$ is the spread at slice $i$ (indexed from bottom to top).
4. If $C < 0.45$ (the bottom half has more geometric spread), the model is determined to be upright (typical for characters with broad shoulders above narrow waists, or trees with canopies above trunks).
5. If $C \geq 0.45$, the model is rotated 180° around the X-axis to flip it upright.
6. Additionally, if the tallest axis is not Y, the model is rotated so that the tallest dimension aligns with Y.

#### 3.5.8. Vertex Color Painting with Gaussian Brush

The front-end implements a real-time vertex painting system using GPU raycasting and a Gaussian brush kernel:

**Raycasting:** The mouse position is converted to normalized device coordinates and a ray is cast into the 3D scene using Three.js's Raycaster. The first mesh intersection point is used as the brush center.

**Gaussian Falloff:** For each vertex within the brush radius $r$, the paint strength follows a Gaussian distribution:

$$s = \exp\left(-\frac{d^2}{2\sigma^2}\right)$$

where $d$ is the distance from the vertex to the brush center in world space and $\sigma = r / 2.5$. This produces a natural soft-edged brush effect.

**Stroke Interpolation:** To ensure continuous paint strokes without gaps, the system interpolates between consecutive mouse positions with a step size of 0.008 in normalized device coordinates (up to 20 sub-steps per frame). This prevents gaps that would appear when the mouse moves faster than the frame rate.

**Color Blending:** The vertex color is interpolated from the existing color toward the brush color by the computed strength factor, producing a natural layered painting effect.

### 3.6. Datasets for Testing

#### 3.6.1. Text Prompt Dataset

The system was tested with a diverse set of text prompts across multiple categories:

- **Characters:** "A medieval knight in full armor," "A cartoon robot with big eyes," "A fantasy elf warrior"
- **Creatures:** "A fire-breathing dragon," "A cute cat sitting," "A realistic horse"
- **Vehicles:** "A futuristic spaceship," "A vintage sports car," "A military tank"
- **Architecture:** "A medieval castle tower," "A Japanese temple," "A modern skyscraper"
- **Weapons:** "A glowing magic sword," "A Viking battle axe," "A sci-fi laser gun"
- **Props:** "A treasure chest," "A wooden barrel," "A crystal ball"

Each category was tested with at least 5 different prompts to evaluate the system's versatility and consistency.

#### 3.6.2. Image Input Dataset

For image-to-3D testing, a curated set of reference images was used:

- Photographs of real objects with clean backgrounds
- Digital artwork and illustrations of 3D-suitable subjects
- AI-generated reference images from external tools
- Product photography (e-commerce style)

Images were selected to test various challenges: complex geometry, thin structures, symmetric objects, and objects with fine details.

#### 3.6.3. Evaluation Metrics

The generated models were evaluated using:

- **Generation time:** End-to-end time from prompt submission to final GLB output.
- **Geometric quality:** Visual inspection of mesh topology, surface smoothness, and absence of artifacts.
- **Texture quality:** Alignment of textures with geometry, color accuracy, and absence of seams.
- **Rigging quality:** Deformation behavior during animation playback, particularly at joints.
- **File size:** The output GLB file size and its suitability for real-time applications.
- **User satisfaction:** Qualitative feedback from test users on the overall experience.

---

## CHAPTER 4: EVALUATION AND RESULTS

### 4.1. Implementation Details

#### 4.1.1. Front-End

The front-end is implemented as a single-page application using React 18 with Vite as the build toolchain. The application consists of over 40 component files totaling approximately 15,000 lines of code.

**Application Structure:**

The application is organized into several functional areas:

- **Landing Page:** A marketing-oriented page featuring animated particle backgrounds (rendered on an HTML5 Canvas element with approximately 80-120 particles using requestAnimationFrame), feature showcases, and call-to-action elements. Framer Motion provides smooth entry animations and parallax-like scroll effects.

- **Authentication Module:** A comprehensive authentication system with five distinct flows — registration with email OTP verification, two-factor login, password reset, admin login, and profile management. The authentication state is managed through a React Context provider that validates JWT tokens against the server on application mount and clears stale sessions automatically.

- **3D Generation Workspace:** The core functionality resides in a central workspace component (approximately 2,800 lines) that manages the complete generation lifecycle. It supports two input modes (text-to-3D and image-to-3D), two quality tiers (fast with Stable Diffusion 1.5 and quality with Stable Diffusion XL), and a batch generation mode that produces four variants simultaneously for user selection.

- **3D Model Viewer:** The interactive 3D viewport is built using React Three Fiber (a React renderer for Three.js) with the drei helper library. It supports orbit controls (rotate, pan, zoom), wireframe toggle, adjustable brightness, animation playback, and a vertex painting system. The viewer automatically centers and scales models using the drei Bounds component and provides environment-mapped lighting for realistic material rendering.

- **Phase 2 Processing Panels:** After initial generation, users access four processing panels: Texturing (style selection, AI options, manual color palette), Rigging (character type selection, bone marker placement), Animation (preset browser with preview), and Remesh (topology conversion with quality settings). An additional download panel supports export to seven formats (GLB, FBX, OBJ, USDZ, STL, BLEND, 3MF).

- **Showcase Gallery:** A public gallery of community-shared models with search, category filtering, grid/masonry view modes, and a detail modal with an embedded 3D viewer.

- **Personal Storage:** A model management dashboard supporting CRUD operations, sharing (public link and showcase listing), duplication, search, filtering by type, and grid/list view modes with pagination.

- **Admin Dashboard:** An administrative panel displaying platform statistics (total users, models, weekly activity) and providing user management capabilities (search, filter, create, edit, block/unblock, delete with cascade).

**Theme System:**

The application implements a dual-theme system (dark and light modes) via React Context. Each theme defines approximately 25 CSS class tokens covering backgrounds, text colors, accents, borders, cards, and interactive elements. The dark theme uses lime/green accents while the light theme uses cyan/blue accents. Theme preference is persisted in localStorage.

**Cross-Platform Deployment:**

The application supports three deployment targets:
- **Web Application:** Standard browser-based SPA served via Vite's development server or built for static hosting.
- **Progressive Web Application:** Service worker registration and web manifest enable offline capability and installability on supported platforms.
- **Desktop Application:** Electron 28 packages the web application as a native desktop application with a frameless window, custom titlebar with native window controls (minimize, maximize, close via IPC), collapsible sidebar navigation, and platform-specific installers (Windows NSIS, macOS DMG, Linux AppImage).

**Performance Optimizations:**

- Lazy mounting of 3D viewers via IntersectionObserver prevents WebGL context exhaustion when many model cards are visible.
- Low-power WebGL settings (single-pixel device pixel ratio, disabled antialiasing) for thumbnail renderers.
- 15-minute timeout configuration for generation requests to accommodate long AI processing times.
- AbortSignal support for user-initiated cancellation of in-progress generation jobs.

#### 4.1.2. Back-End

The back-end is implemented in TypeScript running on Node.js with the Express framework. It serves as the API gateway between the front-end and AI service.

**Server Architecture:**

The Express server listens on port 5000 and is configured with CORS (unrestricted for development), JSON body parsing, URL-encoded form handling, and raw binary body parsing for GLB file uploads (up to 50 MB). Static file serving is configured for the desktop application's release directory.

**Database Layer:**

MongoDB is used for persistent storage via Mongoose ODM (version 7). The connection strategy implements a three-tier fallback:
1. Cloud MongoDB (if a valid connection string is provided via environment variables).
2. Local MongoDB instance at the default port.
3. In-memory MongoDB (via mongodb-memory-server) as a last resort for development environments without a MongoDB installation.

This approach ensures the application can always start, even in minimal development environments.

**Authentication System:**

The authentication module implements bcrypt password hashing (salt rounds of 10), JWT token generation (7-day expiry), and email-based OTP verification via Nodemailer with SMTP. The system supports a development fallback where OTP codes are logged to the console when SMTP credentials are unavailable.

Authentication middleware extracts and verifies JWT tokens from the Authorization header, loads the associated user record, and checks for blocked status before attaching the user object to the request. A separate admin middleware verifies the admin flag on the authenticated user.

**API Gateway Pattern:**

For AI service communication, the back-end acts as a Backend-for-Frontend (BFF) gateway:
- Single generation requests are proxied with a 15-minute timeout.
- Image uploads are received via Multer (memory storage, 20 MB limit) and re-packaged as FormData for the AI service.
- Batch generation jobs are submitted asynchronously (30-second timeout for job creation) and tracked in an in-memory job store.
- Phase 2 operations (texturing, rigging, animation, remeshing, export) are proxied with 5-minute timeouts.
- A demo mode (togglable via configuration) returns placeholder responses without contacting the AI service, enabling front-end development without GPU resources.

**In-Memory Job Management:**

The back-end maintains two in-memory dictionaries for tracking generation jobs:
- Individual job tracking: Maps job IDs to their current status (pending, processing, completed, failed), processing step, and result URLs.
- Batch job tracking: Maps batch IDs to arrays of variant results and tracks auto-save status. When the first variant completes, it is automatically saved to the MongoDB models collection (once, using a guard flag).

#### 4.1.3. AI Service

The AI service is implemented in Python using Flask and orchestrates the entire machine learning pipeline. It represents the most technically complex component of the system.

**Model Loading and Management:**

The service uses a lazy-loading strategy for ML models. Each model (Stable Diffusion 1.5, SDXL, Hunyuan3D, ControlNet) is loaded on first use and cached in memory. Due to VRAM constraints, the Stable Diffusion model is explicitly unloaded (deleted and garbage collected) before loading Hunyuan3D, as both cannot coexist in 12 GB of GPU memory. The GPU optimizer monitors available VRAM and triggers cache clearing when free memory drops below 3-4 GB.

**Text-to-3D Pipeline Implementation:**

The complete text-to-3D pipeline consists of seven sequential stages:

1. **Prompt Enhancement:** The user's text is classified into categories via keyword matching. Category-specific quality descriptors and 3D-optimized modifiers are injected. A carefully crafted negative prompt is constructed to avoid common failure modes.

2. **Text-to-Image Generation:** The enhanced prompt is processed by Stable Diffusion (1.5 for fast mode at 512×512 or SDXL for quality mode at 1024×1024). The DPM++ 2M Karras scheduler is used for efficient 25-30 step inference. Manual CLIP tokenization with explicit truncation at 77 tokens prevents index errors. Optionally, six viewpoint images are generated with a consistent seed.

3. **Background Removal:** The rembg library (using the U2-Net model) segments the foreground object and produces a transparent-background RGBA image.

4. **Foreground Preprocessing:** The foreground is cropped to its bounding box, placed in a square canvas with 85% fill ratio, and padded uniformly.

5. **3D Shape Generation:** Hunyuan3D-DiT processes the prepared image using flow-matching diffusion with FlashVDM turbo (5 inference steps). An octree at resolution 380 guides the marching cubes extraction, producing a triangle mesh with up to 200,000 face chunks.

6. **Post-Processing:** The raw mesh undergoes: disconnected component removal (keeping only the largest connected component), boundary face trimming (removing faces within 2% of bounding box edges), Taubin smoothing (alternating λ/μ passes for volume-preserving noise reduction), quadric edge collapse decimation (targeting 100,000 faces maximum), automatic orientation correction (10-slice cross-sectional analysis), scale normalization (centering, grounding, and uniform scaling to 2.0 units), and mesh repair (hole filling, non-manifold repair, degenerate removal, vertex welding).

7. **Export and Thumbnail:** The processed mesh is exported as GLB format. A thumbnail image is rendered using either PyRender or a fallback painter's algorithm with dual-light Phong shading.

**Image-to-3D Pipeline:**

This pipeline follows the same steps as Text-to-3D but skips the text-to-image generation stage. The user's uploaded image enters the pipeline at the background removal step.

**AI Texturing System:**

The texturing service offers three quality tiers:

- **AI Texturing (highest quality):** The GLB model is rendered from 6 viewpoints to produce depth maps. Each depth map is fed to ControlNet (depth conditioning) with Stable Diffusion 1.5 to generate view-consistent texture images at 2048×2048 resolution (40 inference steps, CFG scale 9.0). The generated views are composited into a texture atlas and projected onto UV coordinates. Four style presets are supported: realistic, stylized, PBR, and hand-painted.

- **PBR Material Generation:** Sobel edge detection on the diffuse texture produces tangent-space normal maps. Laplacian filtering generates roughness maps. Constant metallic maps complete the PBR material set.

- **Procedural Fallback:** When AI models are unavailable, a gradient-based texture with palette selection per style, noise overlay, and Gaussian blur is generated. Box-projection UV mapping uses vertex normals to determine the dominant axis for each face.

**Auto-Rigging System:**

The rigging module implements geometry-driven skeleton creation:

- **Humanoid Skeleton:** 23 bones organized in a hierarchical tree (root → hips → spine chain → neck → head, with bilateral arm and leg chains including fingers and toes). Joint positions are computed as proportional fractions of the bounding box dimensions based on anthropometric ratios.

- **Quadruped Skeleton:** 20 bones (root → spine → neck → head, four legs with upper/lower segments, two-segment tail). Body proportions are derived from the Z-axis (length) dimension.

- **Weight Computation:** The Gaussian-weighted point-to-segment distance algorithm computes smooth skin weights, followed by power sharpening, nearest-bone boosting, top-4 selection, Laplacian smoothing, and vertex welding (as described in the Algorithms section).

- **GLB Binary Manipulation:** The rigging data (joint hierarchy, inverse bind matrices, skin weights) is injected directly into the GLB binary format by parsing and modifying the glTF JSON chunk and appending new binary data to the BIN chunk. New accessors and buffer views are created for JOINTS_0 and WEIGHTS_0 attributes.

**Procedural Animation System:**

Nine animation presets are implemented: walk, run, attack, dance, dead, agree, alert, arise, and be-hit-fly-up. Each animation defines rotation curves (as Euler angles) for relevant bones over 24 keyframes:

- Walk and run use phase-offset sinusoidal functions with counter-rotation for natural gait.
- Attack uses a three-phase timing (wind-up, strike, recovery) with torso twist.
- Dance uses quadrupled-frequency hip sway with raised arm motions.
- Dead implements a four-phase ragdoll collapse with ease-out fall physics.

All rotations are converted to quaternions for glTF compatibility. Translation channels are added for hip bounce (vertical + lateral sinusoidal sway).

**Remeshing Service:**

The topology conversion module supports:
- **Triangle to Quad:** PyMeshLab quadric edge collapse decimation followed by Catmull-Clark subdivision (which naturally creates quad faces).
- **Quad to Triangle:** Adaptive triangulation with subsequent quadric decimation to the target face count.
- Three quality presets: Low (5,000 faces), Medium (15,000 faces), High (50,000 faces).

**Format Export:**

The export module converts GLB to various industry formats: OBJ (geometry-only text format), STL (stereolithography for 3D printing), FBX (via conversion tools), USDZ (Apple's AR format), BLEND (Blender native), and 3MF (3D Manufacturing Format).

### 4.2. Results

#### 4.2.1. Generation Performance

The system's end-to-end generation performance was measured across different hardware configurations:

| Hardware Configuration | Text-to-3D (Fast) | Text-to-3D (Quality) | Image-to-3D |
|----------------------|-------------------|---------------------|-------------|
| RTX 4070 (12 GB) | ~2.5 minutes | ~4 minutes | ~1.5 minutes |
| RTX 3060 (12 GB) | ~3.5 minutes | ~5 minutes | ~2 minutes |
| RTX 3060 (8 GB mode) | ~4.5 minutes | ~7 minutes | ~3 minutes |
| CPU only (16 GB RAM) | ~15+ minutes | ~25+ minutes | ~10+ minutes |

The image-to-3D pipeline is consistently faster because it skips the text-to-image generation stage.

#### 4.2.2. Pipeline Stage Breakdown

For a typical text-to-3D generation on a 12 GB GPU:

| Stage | Time | Percentage |
|-------|------|------------|
| Prompt Enhancement | < 1 second | < 1% |
| Text-to-Image (SD 1.5) | ~30 seconds | ~17% |
| Model Unload/Load | ~15 seconds | ~8% |
| Background Removal | ~5 seconds | ~3% |
| Hunyuan3D Shape Generation | ~60 seconds | ~33% |
| Post-Processing (all steps) | ~30 seconds | ~17% |
| Thumbnail Rendering | ~5 seconds | ~3% |
| File I/O and Transfer | ~10 seconds | ~6% |
| **Total** | **~3 minutes** | **100%** |

#### 4.2.3. Mesh Quality Results

The post-processing pipeline significantly improves raw AI output:

| Metric | Before Post-Processing | After Post-Processing |
|--------|----------------------|---------------------|
| Disconnected components | 3-8 typical | 1 (single manifold) |
| Non-manifold edges | 50-200 | 0 |
| Surface noise level | Visible roughness | Smooth surfaces |
| Face count | 100,000-300,000 | ≤ 100,000 (configurable) |
| Orientation | Random | Upright (Y-up) |
| Scale | Arbitrary | Normalized (2.0 units) |
| Ground plane | Floating | Grounded (Y=0) |

#### 4.2.4. Rigging Quality Assessment

The auto-rigging system was evaluated on generated humanoid and quadruped models:

- **Joint placement accuracy:** Joints are positioned based on bounding box proportions. For humanoid models with typical proportions, joints align well with the expected anatomical positions. For models with unusual proportions (e.g., chibi-style characters), manual adjustment may be needed.
- **Weight smoothness:** The Gaussian falloff with Laplacian post-smoothing produces smooth weight transitions. Vertex welding eliminates visible seam artifacts during animation.
- **Animation playback:** Walk, run, and dance animations produce visually plausible motion for well-proportioned humanoid models. Extreme poses in some animations (combat, dead) may produce minor mesh interpenetration at joints.

#### 4.2.5. Texturing Results

The AI texturing pipeline produces coherent textures across the six viewpoints for most object types. The ControlNet depth conditioning ensures textures follow the surface geometry. However, view consistency can vary depending on the model's complexity:

- Simple, convex objects (spheres, boxes, vehicles) achieve good view consistency.
- Complex objects with many concavities or thin structures may show texture seams between views.
- The PBR material generation (normal maps via Sobel filtering, roughness via Laplacian filtering) adds visual depth to otherwise flat textures.

---

## CHAPTER 5: DISCUSSION AND EVALUATION

### 5.1. Discussion

#### 5.1.1. System Architecture Assessment

The three-tier architecture proves to be a sound design choice for this application. The separation of the Python-based AI service from the Node.js web backend allows each layer to use its optimal technology stack — Python for its rich ML ecosystem (PyTorch, Hugging Face Transformers, trimesh) and Node.js for its efficient asynchronous I/O handling and large web middleware ecosystem.

The API gateway pattern implemented by the Node.js backend provides several practical benefits. It shields the front-end from the complexity of the AI service API, handles authentication and authorization centrally, and enables a demo mode that allows front-end development without requiring GPU resources. The in-memory job tracking system, while not production-grade (it would lose state on server restart), is appropriate for a single-server deployment and provides the necessary async job management functionality.

#### 5.1.2. AI Pipeline Analysis

The two-stage approach to text-to-3D generation (text → image → 3D) has both advantages and disadvantages compared to direct text-to-3D methods:

**Advantages:**
- Leverages the exceptional quality of 2D diffusion models (Stable Diffusion), which have been trained on billions of image-text pairs.
- Allows users to see and potentially modify the intermediate 2D image before 3D reconstruction.
- Hunyuan3D-DiT is specifically optimized for single-image-to-3D reconstruction, producing higher geometric quality than most direct text-to-3D methods.
- The intermediate image serves as a reference for texturing, ensuring color and style consistency.

**Disadvantages:**
- The two-stage pipeline introduces additional latency (30+ seconds for image generation).
- Information is lost at the image bottleneck — a 3D prompt may describe features visible from multiple angles, but the intermediate 2D image captures only one viewpoint.
- View selection (choosing the three-quarter view) is heuristic and may not always produce the optimal input for 3D reconstruction.

#### 5.1.3. Post-Processing Impact

The multi-stage post-processing pipeline is critical for bridging the quality gap between raw AI outputs and usable 3D assets. The most impactful processing steps are:

1. **Disconnected component removal** eliminates floating artifacts that are common in marching cubes extraction from noisy implicit fields.
2. **Taubin smoothing** removes surface noise while preserving overall shape, which is essential because the Laplacian alternative causes visible volume loss.
3. **Automatic orientation correction** addresses a fundamental usability issue — users expect models to appear upright without manual rotation.
4. **Mesh repair** (hole filling, vertex welding) ensures the output is compatible with downstream applications such as 3D printing, game engines, and rigging.

#### 5.1.4. Auto-Rigging Analysis

The Gaussian-weighted distance-based skinning approach represents a pragmatic middle ground between simplistic nearest-bone assignment (which produces harsh weight boundaries and unrealistic deformation) and expensive physically-based methods (heat diffusion, geodesic distances). The key innovations in the implementation are:

- **Power sharpening ($w^5$)** effectively tightens the influence zones without requiring parameter tuning, as the fifth power naturally creates the steep transition curves needed for clean joint deformation.
- **Nearest-bone boosting (25×)** is a robust heuristic that solves the common problem of vertices equidistant from multiple bones receiving diffuse, ambiguous weights.
- **Laplacian weight smoothing** with controlled strength (0.15) provides just enough regularization to eliminate discontinuities without over-smoothing the carefully computed distance-based weights.

However, the approach has inherent limitations: it uses Euclidean distances rather than geodesic distances, meaning that weights do not respect the mesh surface topology. A vertex near a bone through empty space (e.g., a finger vertex near the opposite arm bone) will receive incorrect weight contributions. The power sharpening and nearest-bone boost partially mitigate this issue but cannot fully resolve it.

### 5.2. Evaluation

#### 5.2.1. Objective Achievement Assessment

| Objective | Status | Notes |
|-----------|--------|-------|
| End-to-end AI pipeline integration | Achieved | Text-to-3D and Image-to-3D fully operational |
| Intuitive user interface | Achieved | Non-technical users can generate models via text input |
| Post-processing quality improvement | Achieved | Measurable improvement across all mesh quality metrics |
| Automated rigging system | Achieved | Functional for humanoid and quadruped models |
| Performance evaluation | Achieved | Benchmarked across hardware tiers |
| Cross-platform deployment | Achieved | Web, PWA, and Electron desktop versions |

#### 5.2.2. Comparison with Existing Solutions

| Feature | Polyva 3D | Meshy AI | Luma AI | Blender (Manual) |
|---------|-----------|----------|---------|-------------------|
| Text-to-3D | ✓ | ✓ | ✗ | ✗ |
| Image-to-3D | ✓ | ✓ | ✓ | ✗ |
| Auto-Texturing | ✓ | ✓ | ✗ | Plugin required |
| Auto-Rigging | ✓ | ✗ | ✗ | Plugin required |
| Animation | ✓ | ✗ | ✗ | Manual |
| Vertex Painting | ✓ | ✗ | ✗ | ✓ |
| Remeshing | ✓ | ✗ | ✗ | ✓ |
| Multi-format Export | ✓ (7 formats) | ✓ (4 formats) | ✓ (3 formats) | ✓ (many) |
| Self-hosted | ✓ | ✗ | ✗ | ✓ |
| Open-source | ✓ | ✗ | ✗ | ✓ |
| Desktop App | ✓ | ✗ | ✗ | ✓ |

Polyva 3D offers the most comprehensive feature set among AI-based 3D generation tools while being self-hosted and open-source. However, commercial services like Meshy AI may offer higher model quality due to proprietary model training and dedicated GPU infrastructure.

#### 5.2.3. Usability Assessment

The platform successfully lowers the barrier to 3D content creation:

- A user with no 3D modeling experience can generate a textured, rigged, and animated 3D model in under 10 minutes.
- The same task performed by a skilled 3D artist using traditional tools would typically require several hours to multiple days.
- The dual-theme UI with responsive design provides a professional user experience.
- The batch variant system (generating 4 options) addresses the inherent variability of AI generation by letting users choose the best result.

### 5.3. Limitations and Challenges

#### 5.3.1. Technical Limitations

1. **VRAM Constraints:** The sequential model loading strategy (unloading SD before loading Hunyuan3D) adds 15+ seconds of overhead per generation. On systems with less than 8 GB VRAM, quality is significantly degraded through resolution reduction and reduced inference steps.

2. **Geometric Fidelity:** The system struggles with thin structures (antennae, sword blades, spider legs) because the marching cubes algorithm requires sufficient voxel resolution to resolve thin features. The 380 octree resolution provides a practical balance but cannot capture details thinner than approximately 0.5% of the model's bounding box.

3. **View Consistency in Texturing:** The multi-view texturing approach generates each view independently, which can lead to color and pattern inconsistencies at view boundaries. While ControlNet depth conditioning helps maintain structural alignment, it does not enforce color consistency across views.

4. **Rigging Accuracy:** The bounding-box-based joint placement assumes standard body proportions. Stylized characters (chibi, exaggerated proportions) may have joints in incorrect positions. The Euclidean distance-based skinning does not consider mesh topology, which can cause weight bleeding through thin mesh walls.

5. **Animation Quality:** Procedural animations are generated from predefined sinusoidal functions and do not adapt to the specific geometry of the model. A model with very short legs will receive the same walk cycle as one with long legs, potentially producing unnatural motion.

#### 5.3.2. Scalability Limitations

1. **Single-Server Architecture:** The current deployment runs all three tiers on a single machine. In a production environment, the AI service would need to be scaled horizontally with GPU-equipped workers behind a load balancer.

2. **In-Memory Job Storage:** Job tracking is stored in server memory and is lost on restart. A production system would require a persistent job queue (e.g., Redis, RabbitMQ).

3. **Sequential Processing:** The AI service processes one generation request at a time due to GPU exclusivity. Concurrent requests are queued, which limits throughput to one model per 3-5 minutes.

#### 5.3.3. Quality Limitations

1. **Training Data Bias:** The Stable Diffusion and Hunyuan3D models are trained predominantly on Western art styles and objects. Generation quality may be lower for culturally specific objects or styles underrepresented in the training data.

2. **Prompt Sensitivity:** The quality of generated models is highly sensitive to prompt phrasing. Users often need to experiment with different prompts to achieve satisfactory results. The prompt enhancement algorithm helps but cannot fully compensate for vague or ambiguous inputs.

3. **Color Accuracy:** The text-to-3D pipeline generates colors based on the Stable Diffusion model's interpretation of the prompt, which may not match the user's expectations. The vertex painting and texturing tools partially address this by allowing manual color correction.

---

## CHAPTER 6: CONCLUSION AND FUTURE WORK

### 6.1. Conclusion

This thesis has presented Polyva 3D, a comprehensive AI-powered platform for automated 3D model generation from text descriptions and image inputs. The system successfully integrates multiple state-of-the-art deep learning models — Stable Diffusion for text-to-image synthesis, Hunyuan3D-DiT for single-image-to-3D reconstruction, and ControlNet for geometry-aware texturing — into a unified, user-friendly platform.

The key contributions of this work are:

1. **End-to-End Pipeline Integration:** The system demonstrates that multiple AI models can be orchestrated into a seamless pipeline that transforms natural language descriptions into textured, rigged, and animated 3D models. The adaptive GPU management system enables this pipeline to operate across a range of hardware capabilities, from high-end workstations to consumer laptops.

2. **Automated Post-Processing Suite:** The multi-stage post-processing pipeline (disconnected component removal, Taubin smoothing, quadric decimation, automatic orientation correction, mesh repair) significantly improves the quality of raw AI outputs, bridging the gap between research prototypes and practical tools.

3. **Geometry-Driven Auto-Rigging:** The Gaussian-weighted point-to-segment distance skinning algorithm, combined with power sharpening, nearest-bone boosting, and Laplacian weight smoothing, produces smooth and functional skeletal deformations without requiring machine learning training or large datasets.

4. **Comprehensive Toolset:** Beyond generation, the platform provides AI texturing with PBR material support, procedural animation with nine presets, topology optimization through triangle/quad remeshing, interactive vertex painting with Gaussian brushes, and export to seven industry-standard formats.

5. **Cross-Platform Accessibility:** The platform is deployable as a web application, Progressive Web Application, and desktop application (via Electron), maximizing accessibility across user environments.

The experimental results demonstrate that the platform can generate usable 3D models in 2-5 minutes on consumer GPU hardware, compared to hours or days of manual work by skilled artists. While the generated models do not yet match the quality of hand-crafted assets, they are suitable for rapid prototyping, game development workflows, educational purposes, and applications where speed of creation outweighs the need for fine-grained artistic control.

### 6.2. Future Work

Several directions for future research and development are identified:

#### 6.2.1. Short-Term Improvements

1. **Multi-View Consistent Texturing:** Replacing the independent per-view texture generation with a multi-view consistent diffusion model (such as SyncDreamer or Wonder3D) would eliminate texture seams between viewpoints.

2. **Geodesic Distance Skinning:** Replacing Euclidean point-to-segment distances with geodesic distances computed on the mesh surface would prevent weight bleeding through thin walls and produce more topologically correct deformations.

3. **Adaptive Animation:** Analyzing the model's proportions (limb lengths, body shape) to adjust animation parameters would produce more natural motion for models that deviate from standard proportions.

4. **Persistent Job Queue:** Migrating from in-memory job tracking to a Redis-backed queue would enable server restarts without losing in-progress jobs and lay the groundwork for horizontal scaling.

#### 6.2.2. Medium-Term Enhancements

5. **Real-Time Generation Preview:** Implementing progressive 3D generation with intermediate mesh previews (similar to progressive image loading) would provide users with earlier feedback and allow cancellation of unpromising generations.

6. **Fine-Tuning on Domain Data:** Training LoRA (Low-Rank Adaptation) adapters for Stable Diffusion on specific domains (game assets, architectural elements, characters) would significantly improve generation quality and consistency within those domains.

7. **Collaborative Features:** Adding multi-user collaboration capabilities (shared workspaces, real-time co-editing of models, comment systems) would enhance the platform's utility for team-based workflows.

8. **AI-Guided Prompt Suggestion:** Integrating a large language model to analyze user prompts and suggest improvements or alternatives would help less experienced users generate higher-quality outputs.

#### 6.2.3. Long-Term Research Directions

9. **Direct Text-to-3D Models:** As direct text-to-3D diffusion models mature, the intermediate image stage could be eliminated, reducing latency and avoiding the information bottleneck of 2D projection.

10. **Physics-Aware Generation:** Integrating physics simulation constraints into the generation pipeline would ensure that generated objects are physically plausible (balanced, structurally sound, with proper joints for articulation).

11. **Semantic Mesh Understanding:** Using 3D semantic segmentation to automatically identify mesh parts (head, arms, wheels, etc.) would enable smarter rigging, more accurate texturing, and part-based editing.

12. **On-Device Generation:** With continued advances in model compression (quantization, distillation, pruning), it may become feasible to run simplified generation models directly on client devices, eliminating the need for a server-side AI service.

---

## REFERENCES

1. Ho, J., Jain, A., & Abbeel, P. (2020). Denoising Diffusion Probabilistic Models. *Advances in Neural Information Processing Systems (NeurIPS)*, 33, 6840–6851.

2. Rombach, R., Blattmann, A., Lorenz, D., Esser, P., & Ommer, B. (2022). High-Resolution Image Synthesis with Latent Diffusion Models. *Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)*, 10684–10695.

3. Zhang, L., & Agrawala, M. (2023). Adding Conditional Control to Text-to-Image Diffusion Models. *Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)*, 3836–3847.

4. Mildenhall, B., Srinivasan, P. P., Tancik, M., Barron, J. T., Ramamoorthi, R., & Ng, R. (2020). NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis. *European Conference on Computer Vision (ECCV)*, 405–421.

5. Poole, B., Jain, A., Barron, J. T., & Mildenhall, B. (2022). DreamFusion: Text-to-3D using 2D Diffusion. *International Conference on Learning Representations (ICLR)*.

6. Tencent Hunyuan3D Team. (2024). Hunyuan3D: High-Resolution Texture Synthesis and 3D Generation via Hybrid Diffusion. *arXiv preprint*.

7. Garland, M., & Heckbert, P. S. (1997). Surface Simplification Using Quadric Error Metrics. *Proceedings of ACM SIGGRAPH*, 209–216.

8. Taubin, G. (1995). A Signal Processing Approach to Fair Surface Design. *Proceedings of ACM SIGGRAPH*, 351–358.

9. Baran, I., & Popović, J. (2007). Automatic Rigging and Animation of 3D Characters. *ACM Transactions on Graphics (TOG)*, 26(3), 72.

10. Lorensen, W. E., & Cline, H. E. (1987). Marching Cubes: A High Resolution 3D Surface Construction Algorithm. *ACM SIGGRAPH Computer Graphics*, 21(4), 163–169.

11. Radford, A., Kim, J. W., Hallacy, C., et al. (2021). Learning Transferable Visual Models From Natural Language Supervision (CLIP). *International Conference on Machine Learning (ICML)*, 8748–8763.

12. Podell, D., English, Z., Lacey, K., et al. (2023). SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis. *arXiv preprint arXiv:2307.01952*.

13. Qin, X., Zhang, Z., Huang, C., et al. (2020). U2-Net: Going Deeper with Nested U-Structure for Salient Object Detection. *Pattern Recognition*, 106, 107404.

14. Ranftl, R., Bochkovskiy, A., & Koltun, V. (2021). Vision Transformers for Dense Prediction. *Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)*, 12179–12188.

15. Khronos Group. (2017). glTF 2.0 Specification. https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

16. Catmull, E., & Clark, J. (1978). Recursively Generated B-spline Surfaces on Arbitrary Topological Meshes. *Computer-Aided Design*, 10(6), 350–355.

17. Song, J., Meng, C., & Ermon, S. (2020). Denoising Diffusion Implicit Models (DDIM). *International Conference on Learning Representations (ICLR)*.

18. Lipman, Y., Chen, R. T. Q., Ben-Hamu, H., Nickel, M., & Le, M. (2022). Flow Matching for Generative Modeling. *International Conference on Learning Representations (ICLR)*.

19. Peebles, W., & Xie, S. (2023). Scalable Diffusion Models with Transformers (DiT). *Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)*, 4195–4205.

20. Hu, E. J., Shen, Y., Wallis, P., et al. (2022). LoRA: Low-Rank Adaptation of Large Language Models. *International Conference on Learning Representations (ICLR)*.

21. Facebook Research. (2019). PyTorch3D: A Library for Deep Learning with 3D Data. https://pytorch3d.org/

22. Dawson-Haggerty, M. (2019). trimesh: A Python library for loading and using triangular meshes. https://trimsh.org/

23. Cignoni, P., Callieri, M., Corsini, M., et al. (2008). MeshLab: An Open-Source Mesh Processing Tool. *Eurographics Italian Chapter Conference*, 129–136.

24. Three.js Contributors. (2023). Three.js: JavaScript 3D Library. https://threejs.org/

25. Müller, T., Evans, A., Schied, C., & Keller, A. (2022). Instant Neural Graphics Primitives with a Multiresolution Hash Encoding. *ACM Transactions on Graphics (TOG)*, 41(4), 1–15.

---

*This thesis was prepared as part of the graduation requirements. The Polyva 3D platform demonstrates the practical integration of state-of-the-art AI technologies into an accessible tool for automated 3D content creation.*
