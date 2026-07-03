import React from 'react';
import { Link } from 'react-router-dom';
import './FeishuEntryPage.css';

export default function FeishuEntryPage() {
  return (
    <div className="feishu-entry-app">
      <main className="entry-shell">
        <section className="entry-hero">
          <div className="entry-copy">
            <span className="mini-label">飞书入口</span>
            <h1>高原安A效率先锋汇智箱</h1>
            <p>
              欢迎从飞书进入活动共创空间。你可以投放建议、点赞评论、查看共创排行榜；公开征集营销推广、精品案例、互动体验、嘉宾邀请、客户转化与AIAA晚餐等共创建议。
            </p>
            <div className="entry-actions">
              <Link className="primary link-button" to="/#submit">
                立即投放想法
              </Link>
              <Link className="secondary link-button" to="/#leaderboard">
                查看积分榜
              </Link>
            </div>
          </div>
          <div className="phone-preview" aria-label="飞书入口预览">
            <div className="phone-bar"></div>
            <div className="feishu-card">
              <span>飞书活动筹备群</span>
              <h2>今日共创任务</h2>
              <p>请围绕9月3日全天活动、案例展示、互动体验、客户转化、AIAA晚餐提交建议。</p>
              <strong>公开展示积分排行榜</strong>
            </div>
            <div className="mini-feed">
              <p>精品案例：真实业务前后对比</p>
              <p>互动体验：AI灵感墙滚动高赞建议</p>
              <p>宣传推广：效率挑战短视频预热</p>
            </div>
          </div>
        </section>

        <section className="entry-grid">
          <article className="entry-panel">
            <span>01</span>
            <h2>放进飞书群公告</h2>
            <p>把本页面链接放到“高原安AI效率先锋分享大会筹备群”公告，所有成员可直接进入投放建议。</p>
          </article>
          <article className="entry-panel">
            <span>02</span>
            <h2>放进飞书工作台</h2>
            <p>将入口配置为工作台快捷应用，名称建议使用“效率先锋汇智箱”，图标可使用活动主视觉。</p>
          </article>
          <article className="entry-panel">
            <span>03</span>
            <h2>积分榜与兑换</h2>
            <p>按提交点子、获得点赞、采纳评分自动更新个人积分，多档好礼激励全员共创参与。</p>
          </article>
        </section>

        <section className="entry-config">
          <div>
            <h2>给组委会的配置建议</h2>
            <p>当前原型可直接演示。正式发布时，建议把本工具部署到企业内网或公网 HTTPS 地址，再把链接写入飞书。</p>
          </div>
          <ul>
            <li>
              <strong>飞书群公告标题：</strong>高原安A效率先锋汇智箱开放征集
            </li>
            <li>
              <strong>按钮文案：</strong>投放我的活动建议
            </li>
            <li>
              <strong>建议开放周期：</strong>2026年6月27日 - 2026年7月10日
            </li>
            <li>
              <strong>提醒频率：</strong>每日17:30推送新增高赞建议 and 积分榜前三
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
