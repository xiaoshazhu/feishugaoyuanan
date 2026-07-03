# 高原安A效率先锋汇智箱

本项目已按飞书妙搭项目 `miaoda` 的模板模式完成第一阶段调整，当前结构为 React + Vite 前端、Nest 后端、shared 共享类型的全栈应用骨架。

## 当前结构

- `client/src`：前端页面、组件、样式和浏览器端逻辑。
- `server/modules`：后端业务模块。当前已新增 `huizhi` 模块作为后续汇智箱接口入口。
- `shared`：前后端共享类型。
- `legacy-static`：原高原安静态版页面、样式、脚本、资源和 Express 后端归档，后续业务迁移时从这里逐步搬入妙搭模板结构。

## 后续开发约束

- 新页面放在 `client/src/pages`，通过 `client/src/app.tsx` 配置路由。
- 新组件优先放在 `client/src/components`，复用模板里的 UI 组件和样式能力。
- 新接口放在 `server/modules` 下建立独立 Nest 模块，并在 `server/app.module.ts` 的业务模块区域引入。
- 飞书、多维表格、用户身份等能力后续应按妙搭模板支持的方式接入，不再新增独立 Express 服务或根目录原生 HTML 入口。

## 飞书多维表格集成配置

本项目已支持对接飞书多维表格（Bitable）存储：
1. **环境变量**：在根目录 `.env` 文件中配置以下参数：
   * `FEISHU_APP_ID`: 飞书自建应用的 App ID
   * `FEISHU_APP_SECRET`: 飞书自建应用的 App Secret
   * `FEISHU_BITABLE_APP_TOKEN`: 用于存储数据的多维表格 app_token
   * `FEISHU_BITABLE_TABLE_ID`: 数据表 table_id
2. **应用授权**：请确保该自建应用在飞书开放平台拥有多维表格读写权限，且已将该应用添加为目标表格的协作者（协同编辑权限）。
3. **本地降级**：若未配置或配置无效，应用会自动降级为内存运行模式（内置 seedIdeas），不会影响正常开发预览。

## 可用命令

```bash
npm run dev
npm run build
npm run type:check
```

## 旧版说明

原项目说明已保留在 `legacy-static/README.md`。原页面包括 `legacy-static/index.html`、`legacy-static/feishu-entry.html`、`legacy-static/app.js` 和 `legacy-static/styles.css`。
