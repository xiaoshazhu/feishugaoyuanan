import { CheckCircle2, ClipboardList, Lightbulb, Trophy, UsersRound } from 'lucide-react';

const HomePage = () => {
  const modules = [
    { icon: Lightbulb, title: '点子广场', text: '后续承接投稿、评论、点赞和分类筛选。' },
    { icon: ClipboardList, title: '智能策划', text: '按发起人目标、活动信息和全部投稿生成方案草案。' },
    { icon: Trophy, title: '积分榜', text: '沉淀提交、点赞、采纳点和完整策划的激励规则。' },
    { icon: UsersRound, title: '组委会后台', text: '后续放置采纳评分、发布入口和飞书数据同步。' },
  ];

  return (
    <main className="min-h-screen bg-[#f7faf7] text-[#14211f]">
      <section className="bg-[#0a443f] text-white">
        <div className="mx-auto flex min-h-[420px] w-[min(1120px,calc(100%-32px))] flex-col justify-center gap-8 py-14">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#cfe3d9]">
              飞书妙搭模板化改造版
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              高原安A效率先锋汇智箱
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#e5f2ee]">
              当前已切换为与飞书妙搭项目一致的 React + Vite + Nest 模板结构。后续新增页面、接口、组件和数据能力，都应继续放在这个模板体系内。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <strong className="block text-2xl">2026.09.03</strong>
              <span className="text-sm text-[#dbeae5]">成都活动日</span>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <strong className="block text-2xl">约500人</strong>
              <span className="text-sm text-[#dbeae5]">企业核心人员</span>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-4">
              <strong className="block text-2xl">妙搭结构</strong>
              <span className="text-sm text-[#dbeae5]">等待业务迁移</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(1120px,calc(100%-32px))] py-10">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-2xl font-bold">模板调整结果</h2>
          <p className="text-[#61706c]">
            原静态版本已保留在 legacy-static 中；当前首页仅作为妙搭模式的项目底座，后续会逐步把原业务功能迁入 React 页面和 Nest 接口。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-lg border border-[#dce5e0] bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-[#dff1e8] text-[#12695f]">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{title}</h3>
              <p className="leading-7 text-[#61706c]">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-[#cfe3d9] bg-[#eef7f3] p-5">
          <div className="flex items-center gap-2 font-semibold text-[#0a443f]">
            <CheckCircle2 className="size-5" />
            <span>已对齐飞书妙搭项目结构</span>
          </div>
          <p className="mt-2 text-[#61706c]">
            新代码请优先放入 client/src、server/modules 和 shared，避免再回到根目录 HTML、原生 JS、独立 Express 服务的旧模式。
          </p>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
