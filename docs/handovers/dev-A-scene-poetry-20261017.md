# 刘霞 · 寻镜入诗开发交接（2026-10-17）

## 按钮反馈修复
- 首页「摄景寻诗」复用 home-poem-more 样式，与「展卷细读」一致。
- 「入诗」原先为没有事件的装饰 span，现改为真实 button：点击收藏、进行中禁用、完成显示「已藏」，再次点击打开画阁；下方收藏按钮同步更新。
- 浏览器实际验证收藏及画阁新增藏卷通过；ESLint 和生产构建通过。仍未提交或推送。

## 基线与交付状态
- 从 GitHub 拉取 origin/main，基线 f5d0651；本地分支 feat/scene-poetry-20261017。
- 开发前备份：D:\数媒比赛\云山竹简_开发前备份_20261017_075128。project 为文件副本，repository-all.bundle 为 Git 历史；不含 node_modules、dist 和运行中的数据库。
- 按用户最新要求：仅本地修改，未提交、未推送、未合并，等待用户检查。
- 保留原有未跟踪 dev-A-shuzhai-flow-20261015.md、环境配置和旧 stash。

## 已实现
首页古诗词赏析下方新增「寻镜入诗」；书斋新增「诗境画阁」。
路径：/scene-poetry → /scene-poetry/view/draft → /mine/scenes → /scene-poetry/view/:id。

1. 拍照/相册 JPG、PNG、WebP，前端压缩至最长边 1280；服务器检查格式与像素。
2. 本机服务器真实运行 SegFormer-B0 q8 语义分割，输出掩膜 RLE 与边界；Canvas 绘制可点击轮廓。允许更名、点选、手动矩形补选，人工与模型来源分开记录。
3. 20 条精选原诗节选、意象索引与原文检索链接。匹配采用可解释规则；不是自训练诗词模型。不能由天空推断星辰、由水面推断荷花。
4. Depth Anything V2 Small q8 输出相对深度，WebGL 提供轻微 2.5D 视差；不是完整三维重建。无 WebGL/深度失败时保留原景。
5. 诗句意象可点击，联动对应区域；作品可保存、刷新回看、移出、原生 Canvas 导出 1200px 宽 PNG（600px 设计宽度的 2 倍）。
6. IndexedDB 保存照片、掩膜、深度与诗句，按现有 scholarScope 分开查询；本机存储不等同于服务端权限隔离或跨设备同步。照片在识景接口内存处理，不写服务端文件。
7. 携景论诗将选景、诗句填入李白/苏轼输入框，用户自行发送。没有把照片传给对话模型，也不声称先贤已看图。
8. 图标使用项目 iconfont / antd-mobile-icons。新页面复用 study-page / InkWashBackground，与藏牒阁、物溯宝鉴统一动态背景。装饰插画独立于图标与按钮。

## 本机与其他成员启动
后端 Node 22；新增依赖已锁定 @huggingface/transformers 3.8.1、sharp 0.34.5。

```powershell
cd backend
npm ci
powershell -File scripts/prepare-scene-models.ps1
# 若需要代理，可追加 -Proxy http://127.0.0.1:7897
node src/index.js
```

另开前端：npm ci、npm run dev。后端 3000，前端 5173，/api 经 Vite 代理。
模型约 30MB，置于 backend/models/scene（Git 忽略，不随代码推送）。部署和队友首次运行必须准备模型；这台电脑已经准备好。Windows 使用 PowerShell 下载脚本，其他平台需按脚本所列固定 revision 下载同名文件。

模型固定来源：
- Xenova/segformer-b0-finetuned-ade-512-512，revision d3e5499fa8701ff0453ca940a8dfeae39b2f1504。
- onnx-community/depth-anything-v2-small，revision 4472b7362082ad9968fee890ca0f1e5aca36b93d。

GET /api/scene/status：模型准备状态。POST /api/scene/analyze：{ image: dataURL }，成功返回 code=1、data（width、height、regions、depth）。400 非法图片、429 当前繁忙、503 模型缺失/超时。单 worker 串行推理，90 秒超时，取消终止 worker；推理禁用远程模型下载。

## 验证
- ESLint 新增前端文件通过；Vite 生产构建通过。
- backend/scripts/test-scene-poetry.cjs：4 项通过，包括掩膜往返、手动框选边界、意象匹配边界、经 5173 代理的真实模型 HTTP 推理与坏图片校验。
- 执行 HTTP 项：设置 SCENE_API=http://127.0.0.1:5173/api/scene，再 node --test scripts/test-scene-poetry.cjs。
- 山水插画接口成功；另用 Transformers.js 文档实拍 house.jpg 验证识别建筑、天空、树木、芳草与深度输出。未承诺任意照片都准确。
- 浏览器完成示例识景、选苏轼诗、层次展示、保存画阁、刷新保留；相册上传 house.jpg 后也得到真实识别结果；高清 PNG 下载成功。
- 修复反馈：Vite 日志确认 /api/scene/analyze 连接 127.0.0.1:3000 超时（ETIMEDOUT），重启无响应的本机服务后经代理确认接口 200；错误提示改为本页中文提示并保留照片，不再冒出通用英文 500 Toast。新页面 Canvas 背景原先缺定位导致挤占文档流，现复用 study-page；首页插画改为独立装饰 img，避开已有边角伪元素冲突。移除用户指定的两段说明。

## 限制与后续
- 该语义模型为 ADE20K 类别，不是开放词汇识别；亭子通常归建筑，柳/竹/月/星等细意象需人工确认。同类多个物体可能合并为一个区域。
- 256px 长边的输出掩膜用于轻量交互，细枝边缘可能粗糙；可提高输出网格但需实机性能测试。
- 收藏目前只存浏览器。跨设备云端收藏、游客归并、共享链接未实现，不宣称已实现。
- 目前单请求串行；公开部署需结合实际并发设计队列、限流和鉴权，不能直接宣称高并发服务。
- 手机摄像头入口依赖浏览器与系统；须在实际手机环境验收，浏览器自动化只验证文件选择。
- SegFormer 上游 [NVIDIA 许可](https://github.com/NVlabs/SegFormer/blob/master/LICENSE) 限非商业研究/评估用途，不能宣称可自由商业化；转换模型页面未单独给出宽松授权。商业发布前需确认授权或替换模型。Depth Small [模型页](https://huggingface.co/onnx-community/depth-anything-v2-small) 标为 Apache-2.0。模型权重没有纳入 Git。
- 画面识别用预训练模型，诗词是精选规则索引；答辩应明确团队贡献是应用与交互链路，勿称自主训练或最前沿 SOTA。

## 插画来源
frontend/public/images/scene/poetic-lake-v1.webp，由本次内置 imagegen 生成；原图 1536×1024，转 WebP。用途：卡片装饰及山水画示例，不冒充实拍。完整提示词见同目录 README.md。

## 识景与匹配调整（2026-10-17）
- 已移除用户指定的模型候选/人工确认来源说明、本机存储长说明，页面仅保留正常操作反馈；存储仍为本机 IndexedDB。
- 首页摄景寻诗右侧边距匹配相邻按钮的卡片内边距，使两按钮右边缘对齐。
- SegFormer 与深度输入由 256px 提高至最长边 512px，输出网格 384px；掩膜用最近邻缩放。保持 q8 和 CPU 模型不变。
- 语料 20→29 条；排序加入区域面积显著度、语义权重与必要意象条件；不再仅按命中标签数量。缺村落建筑不推荐过故人庄，缺雨不推荐约客；补充雪山、群峰、湖亭、花草诗句。
- 新增雪山/湖亭/花海与微小草地区域干扰测试；包含真实 HTTP 推理的 6 项测试通过，实拍 house.jpg 识别接口返回 200；前端 ESLint 与构建通过。没有承诺量化准确率提升。

### 分割模型升级补记
- 已通过当前山景、实拍房屋、山水插画对比，默认采用 SegFormer-B1 q8；prepare-scene-models.ps1 改为下载 segmenter-b1，固定 revision 6308717ce1fc0f39dd847e3b2e98edebc4ace4a0。旧 B0 目录保留作兼容。共享 sceneModelConfig.js 保证 status 与实际模型名称一致。
- 默认权重约40MB，仍为CPU本地推理。B1 样例分割单次约0.9–1.2秒，仅为该机少量样例，不是整体延迟保证；接口还包含解码、深度与传输。
- 核查配置发现 ADE20K 不含直接 snow 标签，之前映射中的 snow 并不表示模型能自动识别积雪；当前雪意象由用户手动确认。对比实验未将低可信零样本分类结果混入页面或配诗。
- B1 来源：https://huggingface.co/Xenova/segformer-b1-finetuned-ade-512-512 ，许可沿用相应 NVIDIA 上游限制。
