/**
 * @file app.js
 * @description 高原安A效率先锋汇智箱 前端交互逻辑与业务引擎
 * 支持与后端 API 的实时数据交互；若后端未运行，则平滑降级到 LocalStorage 本地引擎运行。
 * 包含管理员口令校验、AI 打分/点评展示、多人协作机制及发布文案生成。
 * 
 * Produced by Antigravity for 高原安AI效率先锋分享大会.
 */

const STORAGE_KEY = "gaoyuan-ai-huizhi-box-v1";
const validViews = ["ideas", "info", "intent", "submit", "ai-plan", "publish", "leaderboard", "roadmap", "admin"];

const categories = [
  "活动定位",
  "活动基本信息",
  "精品案例",
  "互动体验",
  "嘉宾邀请",
  "宣传推广",
  "客户转化",
  "AIAA晚餐",
  "合规边界",
  "现场执行",
  "智能策划"
];

// 本地默认发起人想法配置
const defaultIntent = {
  purpose: "高原安、字节跳动、海科科技共同发起，打造一场面向约500位企业核心人员的AI效率先锋活动，展示AI和飞书在企业管理中的实战价值，提升行业影响力并促进高质量商机转化。",
  outcome: "让企业主看见真实案例、愿意交流、愿意留下需求；让飞书效率先锋决赛形成传播亮点；让AIAA晚餐承接30位企业主深度交流；最终沉淀一份可执行、可传播、可复盘的总策划。",
  resources: "活动时间为2026年9月3日全天，地点成都，总人数约500人。上午9:00-12:00，12:00-13:30自助餐交流，下午13:30-17:30，间隙插入共90分钟热场活动和问题解答，18:00-20:00 AIAA晚餐，自愿AA制报名，每人198元，约30人，主要针对企业主。现场若挂飞书名，不做直接商业售卖。",
  keywords: "AI企业管理,飞书效率,实战分享,效率先锋决赛,企业主,商机转化,客户信息收集,互动热场,问题解答,AIAA晚餐,字节跳动高级分享,合规,成都,500人"
};

const defaultPublish = {
  publishUrl: getDefaultEntryUrl(),
  dinnerUrl: "",
  audienceType: "内部筹备成员"
};

// 客户端状态
let state = {
  ideas: [],
  intent: structuredClone(defaultIntent),
  publish: structuredClone(defaultPublish)
};

// 是否降级为本地离线模式
let isOffline = true;

// 待执行的管理员回调动作
let activeAdminCallback = null;

// 初始化系统
init();

/**
 * 获取飞书入口默认地址
 * @returns {string} 默认飞书入口URL
 */
function getDefaultEntryUrl() {
  const entryUrl = new URL("./feishu-entry.html", window.location.href);
  entryUrl.hash = "";
  return entryUrl.href;
}

/**
 * 系统初始化主入口
 * 检测后端 API 服务是否在线，并加载对应的数据源与监听事件。
 */
async function init() {
  try {
    // 探测后端服务是否运行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5秒超时判定为离线

    const response = await fetch('/api/ideas', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      isOffline = false;
      console.log('✅ [网络连接正常] 成功接入高原安汇智箱后端API服务。');
    }
  } catch (err) {
    isOffline = true;
    console.warn('⚠️ [降级提示] 未能连接到后端 API 服务，已平滑切换到 LocalStorage 本地引擎演示。');
  }

  // 加载数据
  await loadAllData();

  // 初始化分类选择框
  renderCategoryOptions();

  // 渲染所有面板
  renderAll();

  // 绑定交互事件监听
  initEventListeners();

  // 处理哈希视图定位
  applyHashView();
}

/**
 * 加载所有数据（根据在线状态分流）
 * @returns {Promise<void>}
 */
async function loadAllData() {
  if (isOffline) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 写入初始空白态或默认的预设种子
      state.ideas = [];
      state.intent = structuredClone(defaultIntent);
      state.publish = structuredClone(defaultPublish);
      saveLocalState();
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state.ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
      state.intent = { ...defaultIntent, ...(parsed.intent || {}) };
      state.publish = { ...defaultPublish, ...(parsed.publish || {}) };
    } catch {
      state.ideas = [];
    }
  } else {
    try {
      // 从后端API并发读取数据
      const [ideasRes, intentRes] = await Promise.all([
        fetch('/api/ideas'),
        fetch('/api/configs/intent')
      ]);
      state.ideas = await ideasRes.json();
      state.intent = await intentRes.json();
      
      // publish配置暂保存在本地，亦可后续拓展到后端
      const localPublish = localStorage.getItem(STORAGE_KEY + '_pub');
      state.publish = localPublish ? JSON.parse(localPublish) : structuredClone(defaultPublish);
    } catch (err) {
      console.error('拉取后端API数据失败:', err);
    }
  }
}

/**
 * 本地存储状态数据（降级模式下使用）
 */
function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ideas: state.ideas,
    intent: state.intent
  }));
}

/**
 * 校验当前是否处于管理员授权状态
 * @returns {boolean} 是否为管理员
 */
function isAuthorized() {
  const token = sessionStorage.getItem('admin_key');
  return !!token;
}

/**
 * 打开管理员身份验证模态框
 * @param {Function} successCallback 验证成功后要执行的回调函数
 */
function showAdminLoginModal(successCallback) {
  activeAdminCallback = successCallback;
  const modal = document.querySelector('#adminModal');
  const errorMsg = document.querySelector('#adminLoginError');
  const pwdInput = document.querySelector('#adminPassword');
  
  errorMsg.textContent = '';
  pwdInput.value = '';
  modal.removeAttribute('hidden');
  pwdInput.focus();
}

/**
 * 关闭管理员口令验证模态框
 */
function closeAdminLoginModal() {
  const modal = document.querySelector('#adminModal');
  modal.setAttribute('hidden', 'true');
  activeAdminCallback = null;
}

/**
 * 计算点子的传统得分（前台展示）
 * @param {Object} idea 点子对象
 * @returns {number} 最终积分
 */
function scoreIdea(idea) {
  return 1 + (idea.votes || 0) * 0.2 + (idea.adoptedPoints || 0) * 5 + (idea.fullPlan ? 20 : 0);
}

/**
 * 汇总各共创成员的贡献积分榜
 * @returns {Array<Object>} 汇总后的积分榜列表
 */
function aggregatePeople() {
  const people = new Map();
  state.ideas.forEach((idea) => {
    const key = idea.author.trim();
    const current = people.get(key) || {
      author: idea.author,
      role: idea.role,
      ideas: 0,
      votes: 0,
      adoptedPoints: 0,
      fullPlans: 0,
      score: 0
    };
    current.ideas += 1;
    current.votes += idea.votes || 0;
    current.adoptedPoints += idea.adoptedPoints || 0;
    current.fullPlans += idea.fullPlan ? 1 : 0;
    current.score += scoreIdea(idea);
    people.set(key, current);
  });
  return [...people.values()].sort((a, b) => b.score - a.score);
}

/**
 * 本地模拟智能算法引擎点评生成（离线兜底使用）
 * @param {Object} idea - 目标点子
 * @returns {Object} 包含AI得分及评语的结果
 */
function runLocalMockAi(idea) {
  const text = `${idea.title} ${idea.content}`;
  const isBitable = text.includes('多维表格') || text.includes('飞书');
  const isDinner = idea.category === 'AIAA晚餐';
  
  let innovation = 75;
  let feasibility = 80;
  let conversion = 70;
  let feishuFit = 75;

  if (isBitable) { feishuFit += 15; innovation += 8; }
  if (isDinner) { conversion += 15; feasibility -= 5; }

  const aiScore = Math.min(100, Math.round(innovation * 0.25 + feasibility * 0.35 + conversion * 0.20 + feishuFit * 0.20));
  
  let aiReview = `【AI点评（降级模式）】对于“${idea.title}”的设想，该点子在${idea.category}领域展现了不错的实践前景。`;
  if (idea.category === '精品案例') {
    aiReview += `通过前后效率的业务真实对比能够非常直观地打动企业老板，建议在飞书汇报时重点展示底层流程流转耗时的降幅。`;
  } else if (idea.category === '客户转化') {
    aiReview += `客户意向跟进是转化的关键。建议在飞书多维表格中接入消息推送，一旦有高意向客户填写问卷，立即通知负责BD。`;
  } else {
    aiReview += `此方案落地性较强，可直接纳入下午的研讨议程。后续应进一步明确海科科技与高原安团队在落地执行上的资源边界。`;
  }

  return {
    aiScore,
    aiReview,
    breakdown: { innovation, feasibility, conversion, feishuFit }
  };
}

/**
 * 生成策划案数据
 * @returns {Object} 大会策划案大纲
 */
function generatePlan() {
  const ranked = [...state.ideas].map(idea => {
    // 兼容没有AI分数的存量点子
    if (idea.aiScore === undefined) {
      const mockResult = runLocalMockAi(idea);
      idea.aiScore = mockResult.aiScore;
      idea.aiReview = mockResult.aiReview;
    }
    return idea;
  }).sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

  const selected = ranked.slice(0, Math.min(6, ranked.length));
  const scoreTotal = selected.reduce((sum, idea) => sum + (idea.aiScore || 75), 0) || 1;
  selected.forEach((idea) => {
    idea.planWeight = Math.round(((idea.aiScore || 75) / scoreTotal) * 100);
  });

  const keywords = state.intent.keywords.split(/[,，、\s]+/).filter(Boolean).slice(0, 14);

  return {
    title: "高原安AI效率先锋分享大会全天总策划草案",
    ranked,
    selected,
    keywords
  };
}

/**
 * 构建群公告发布邀请文案
 * @returns {string} 飞书群公告文字
 */
function buildPublishMessage() {
  const url = state.publish.publishUrl || "【请填写正式入口链接】";
  const dinner = state.publish.dinnerUrl ? `\nAIAA晚餐报名链接：\n${state.publish.dinnerUrl}\n` : "";
  const audienceLine =
    state.publish.audienceType === "企业主与高管"
      ? "本次重点邀请企业主、高管、企业二代及数字化转型核心人员参与。"
      : state.publish.audienceType === "合作伙伴"
        ? "欢迎合作伙伴围绕案例展示、客户邀约、现场互动和传播资源提出建议。"
        : "请内部筹备成员围绕活动内容、现场执行、客户转化和AIAA晚餐积极共创。";

  return `各位好，高原安A效率先锋汇智箱已开放。

${audienceLine}

本次活动基本信息：
时间：2026年9月3日全天
地点：成都
规模：约500人
主题：AI运用于企业管理的实战分享、飞书效率先锋决赛对决、AI时代企业管理经验交流、飞书应用于现代企业管理的未来与设想

请大家点击入口，提交活动建议、案例策划、互动点子、客户转化方案或AIAA晚餐建议。系统会根据高原安、字节跳动、海科科技三方发起人想法，对投稿进行智能策划撮合，并生成采纳权重与AI建议分。

汇智箱入口：
${url}
${dinner}
积分规则：
提交有效建议 +1分；被点赞 +0.2分/赞；被采纳 +5分/点；完整策划被采用 +20分。

欢迎大家多投、多评、多补充，让好点子真正进入9月3日活动总策划。`;
}

/**
 * 切换主视图，并校验管理员视窗可见度
 * @param {string} viewName - 目标视图名称
 */
function setView(viewName) {
  // 如果是需要管理员口令的页面，且未登录
  if ((viewName === 'intent' || viewName === 'admin') && !isAuthorized()) {
    // 显示锁屏，隐藏真实内容
    document.querySelector(`#lock-${viewName}`).removeAttribute('hidden');
    document.querySelector(`#${viewName}FormContainer`).setAttribute('hidden', 'true');
  } else if (viewName === 'intent' || viewName === 'admin') {
    // 已解锁，显示表单，隐藏锁屏
    document.querySelector(`#lock-${viewName}`).setAttribute('hidden', 'true');
    document.querySelector(`#${viewName}FormContainer`).removeAttribute('hidden');
  }

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName && button.classList.contains("tab"));
  });
  if (location.hash.replace("#", "") !== viewName) {
    history.replaceState(null, "", `#${viewName}`);
  }
}

/**
 * 刷新渲染导航栏上组委会模式激活标贴
 */
function renderTopbarBadge() {
  const topbar = document.querySelector('.topbar');
  let badge = document.querySelector('#admin-status-badge');
  
  if (isAuthorized()) {
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'admin-status-badge';
      badge.className = 'admin-badge-active';
      badge.innerHTML = '⚙️ 组委会模式 (已解锁) <a href="#" id="logout-admin-link" style="margin-left:8px;text-decoration:underline;">退出</a>';
      topbar.appendChild(badge);
      
      document.querySelector('#logout-admin-link').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('admin_key');
        renderTopbarBadge();
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
          setView(activeTab.dataset.view);
        }
      });
    }
  } else {
    if (badge) {
      badge.remove();
    }
  }
}

/**
 * 渲染分类选择下拉框
 */
function renderCategoryOptions() {
  const category = document.querySelector("#category");
  const filter = document.querySelector("#categoryFilter");
  category.innerHTML = categories.map((name) => `<option value="${name}">${name}</option>`).join("");
  filter.innerHTML = `<option value="全部">全部分类</option>${categories
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("")}`;
}

/**
 * 渲染大堂核心统计数据
 */
function renderMetrics() {
  const people = aggregatePeople();
  document.querySelector("#metricIdeas").textContent = state.ideas.length;
  document.querySelector("#metricAdopted").textContent = state.ideas.reduce((sum, idea) => sum + (idea.adoptedPoints || 0), 0);
  document.querySelector("#metricPeople").textContent = people.length;
}

/**
 * 获取过滤及排序后的可见点子列表
 * @returns {Array<Object>} 点子列表
 */
function getVisibleIdeas() {
  const category = document.querySelector("#categoryFilter").value;
  const sortMode = document.querySelector("#sortMode").value;
  let ideas = [...state.ideas];
  
  if (category !== "全部") {
    ideas = ideas.filter((idea) => idea.category === category);
  }
  
  if (sortMode === "new") {
    ideas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortMode === "hot") {
    ideas.sort((a, b) => (b.votes || 0) + (b.comments ? b.comments.length : 0) - ((a.votes || 0) + (a.comments ? a.comments.length : 0)));
  } else if (sortMode === "score") {
    ideas.sort((a, b) => scoreIdea(b) - scoreIdea(a));
  }
  return ideas;
}

/**
 * 渲染“点子广场”面板
 */
function renderIdeas() {
  const list = document.querySelector("#ideaList");
  const tpl = document.querySelector("#ideaCardTpl");
  list.innerHTML = "";
  
  const visible = getVisibleIdeas();
  if (visible.length === 0) {
    list.innerHTML = `<div class="empty-state">🎉 暂无此分类建议，快去“投放想法”板块投出你的第一个创意吧！</div>`;
    return;
  }

  visible.forEach((idea) => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector(".idea-card");
    
    card.querySelector(".badge").textContent = idea.category;
    card.querySelector(".phase").textContent = idea.phase;
    card.querySelector("h3").textContent = idea.title;
    card.querySelector(".idea-content").textContent = idea.content;
    card.querySelector(".author").textContent = `${idea.author} · ${idea.role}`;
    
    // 显示 AI 建议分勋章
    const aiBadge = card.querySelector(".ai-score-badge");
    if (idea.aiScore !== undefined) {
      aiBadge.textContent = `AI ${idea.aiScore}分`;
      aiBadge.removeAttribute('hidden');
      // 给好评分数上色
      if (idea.aiScore >= 85) {
        aiBadge.className = "ai-score-badge score-gold";
      } else if (idea.aiScore >= 75) {
        aiBadge.className = "ai-score-badge score-mint";
      } else {
        aiBadge.className = "ai-score-badge score-gray";
      }
    } else {
      aiBadge.setAttribute('hidden', 'true');
    }

    // 显示 AI 架构师评语
    const aiReviewBox = card.querySelector(".ai-review-box");
    if (idea.aiReview) {
      aiReviewBox.querySelector(".ai-review-text").textContent = idea.aiReview;
      aiReviewBox.removeAttribute('hidden');
    } else {
      aiReviewBox.setAttribute('hidden', 'true');
    }

    card.querySelector(".adoption").innerHTML = `采纳点 <strong>${idea.adoptedPoints || 0}</strong> · 当前积分 <strong>${scoreIdea(idea).toFixed(1)}</strong>${idea.fullPlan ? " · 完整策划" : ""}`;

    const voteBtn = card.querySelector(".vote-btn");
    voteBtn.textContent = `👍 点赞 ${idea.votes || 0}`;
    voteBtn.addEventListener("click", async () => {
      if (isOffline) {
        idea.votes = (idea.votes || 0) + 1;
        saveLocalState();
        renderAll();
      } else {
        try {
          const response = await fetch(`/api/ideas/${idea.id}/vote`, { method: 'POST' });
          if (response.ok) {
            const updated = await response.json();
            idea.votes = updated.votes;
            renderAll();
          }
        } catch (err) {
          console.error('在线点赞同步失败:', err);
        }
      }
    });

    const comments = card.querySelector(".comments");
    const commentToggle = card.querySelector(".comment-toggle");
    commentToggle.textContent = `💬 评论 ${(idea.comments || []).length}`;
    commentToggle.addEventListener("click", () => {
      comments.hidden = !comments.hidden;
    });

    const commentList = card.querySelector(".comment-list");
    commentList.innerHTML = (idea.comments || []).map((comment) => `<p>${escapeHtml(comment)}</p>`).join("");
    
    card.querySelector(".comment-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("input");
      const val = input.value.trim();
      if (!val) return;

      if (isOffline) {
        if (!idea.comments) idea.comments = [];
        idea.comments.push(val);
        input.value = "";
        saveLocalState();
        renderAll();
      } else {
        try {
          const response = await fetch(`/api/ideas/${idea.id}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: val })
          });
          if (response.ok) {
            const updated = await response.json();
            idea.comments = updated.comments;
            input.value = "";
            renderAll();
          }
        } catch (err) {
          console.error('在线评论提交失败:', err);
        }
      }
    });

    list.appendChild(node);
  });
}

/**
 * 渲染积分贡献排行榜
 */
function renderLeaderboard() {
  const leaderboard = document.querySelector("#leaderboard");
  const people = aggregatePeople();
  if (people.length === 0) {
    leaderboard.innerHTML = `<div class="empty-state">🎉 暂无积分记录，贡献建议和点赞将激活此排行榜！</div>`;
    return;
  }

  leaderboard.innerHTML = people
    .map(
      (person, index) => `
        <article class="leader-row">
          <span class="rank rank-${index + 1}">${index + 1}</span>
          <div>
            <h3>${escapeHtml(person.author)} <small>${escapeHtml(person.role)}</small></h3>
            <p class="muted">${person.ideas}条建议 · ${person.votes}个赞 · ${person.adoptedPoints}个采纳点 · ${person.fullPlans}份完整策划</p>
          </div>
          <strong class="leader-score">${person.score.toFixed(1)} 分</strong>
        </article>
      `
    )
    .join("");
}

/**
 * 渲染管理员“组委会后台”操作区
 */
function renderAdmin() {
  const adminList = document.querySelector("#adminList");
  if (state.ideas.length === 0) {
    adminList.innerHTML = `<p class="muted" style="text-align:center;padding:24px;">暂无收集到的投稿点子</p>`;
    return;
  }

  adminList.innerHTML = state.ideas
    .map(
      (idea) => `
        <article class="admin-item" data-id="${idea.id}">
          <div>
            <h3>${escapeHtml(idea.title)}</h3>
            <p>${escapeHtml(idea.author)} · ${escapeHtml(idea.category)} · AI建议分: ${idea.aiScore || '计算中'}分 · 当前积分: ${scoreIdea(idea).toFixed(1)}分</p>
          </div>
          <div class="admin-control-set">
            <label>采纳点: <input type="number" min="0" step="1" class="admin-adopt-input" value="${idea.adoptedPoints || 0}" aria-label="采纳点数量" /></label>
            <button class="secondary full-plan ${idea.fullPlan ? 'btn-active-gold' : ''}">${idea.fullPlan ? "★ 完整策划" : "☆ 标为完整"}</button>
          </div>
        </article>
      `
    )
    .join("");

  // 绑定按钮和输入框更新逻辑
  adminList.querySelectorAll(".admin-item").forEach((item) => {
    const idea = state.ideas.find((entry) => entry.id === item.dataset.id);
    
    // 输入框变更采纳点
    item.querySelector(".admin-adopt-input").addEventListener("change", async (event) => {
      const val = Math.max(0, Number(event.target.value) || 0);
      if (isOffline) {
        idea.adoptedPoints = val;
        saveLocalState();
        renderAll();
      } else {
        try {
          const response = await fetch(`/api/admin/ideas/${idea.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': sessionStorage.getItem('admin_key')
            },
            body: JSON.stringify({ adoptedPoints: val })
          });
          if (response.ok) {
            idea.adoptedPoints = val;
            renderAll();
          } else {
            alert('保存失败，请检查口令状态。');
          }
        } catch (err) {
          console.error('组委会采纳点保存异常:', err);
        }
      }
    });

    // 标记完整策划
    item.querySelector(".full-plan").addEventListener("click", async () => {
      const targetState = !idea.fullPlan;
      if (isOffline) {
        idea.fullPlan = targetState;
        saveLocalState();
        renderAll();
      } else {
        try {
          const response = await fetch(`/api/admin/ideas/${idea.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': sessionStorage.getItem('admin_key')
            },
            body: JSON.stringify({ fullPlan: targetState })
          });
          if (response.ok) {
            idea.fullPlan = targetState;
            renderAll();
          } else {
            alert('保存失败，口令校验未通过。');
          }
        } catch (err) {
          console.error('组委会标记完整策划异常:', err);
        }
      }
    });
  });
}

/**
 * 渲染“发起人想法”页面内容
 */
function renderIntent() {
  document.querySelector("#intentPurpose").value = state.intent.purpose || '';
  document.querySelector("#intentOutcome").value = state.intent.outcome || '';
  document.querySelector("#intentResources").value = state.intent.resources || '';
  document.querySelector("#intentKeywords").value = state.intent.keywords || '';
}

/**
 * 渲染 AI 智能撮合策划案及得分细项
 */
function renderAIPlan() {
  const plan = generatePlan();
  document.querySelector("#planTitle").textContent = plan.title;
  
  const selectedTitles = plan.selected.map((idea) => {
    const badgeColor = (idea.aiScore || 75) >= 85 ? '#d49a32' : '#12695f';
    return `<li>
      <span>${escapeHtml(idea.title)}</span>
      <small style="background:${badgeColor};color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px;font-size:11px;">AI建议权重 ${idea.planWeight}%</small>
    </li>`;
  }).join("");

  document.querySelector("#planNarrative").innerHTML = `
    <h3>一、策划主线（AI智能生成）</h3>
    <p>围绕“AI运用于企业管理的实战分享”，以“飞书效率先锋决赛”为线下高燃爆点，通过三方发起人资源共创，建立从<strong>企业主会前兴趣收集 - 大会现场对比展示 -IAA晚宴社交跟进</strong>的闭环商机孵化主线。</p>
    
    <h3>二、建议活动结构</h3>
    <p>上午重点在成都向约500位参会嘉宾展现飞书与AI提效案例，打动企业主；中午设自助餐便于现场勾连；下午决赛对决展示企业实战方法论，并在热场活动与问题解答环节穿插收集意向标签；晚间组织30位重点企业主进行198元AA制AIAA晚餐深度建群与商机转化。</p>
    
    <h3>三、AI 撮合核心建议建议采纳清单</h3>
    <ul class="ai-recommend-list">${selectedTitles || '<li class="muted">当前暂无收集到高契合度的投稿点子</li>'}</ul>
    
    <h3>四、专家合规建议</h3>
    <p>现场若挂飞书官方名称，必须确保不进行任何商业产品的直接售卖。销售动作重点聚焦“数字化转型经验分享”与“AI工具提效展示”，在合规的安全边界内树立飞书效率先锋形象。</p>
  `;

  document.querySelector("#planKeywords").innerHTML = plan.keywords.map((keyword) => `<span># ${escapeHtml(keyword)}</span>`).join("");
  
  document.querySelector("#aiWeightList").innerHTML = plan.ranked
    .map(
      (idea) => `
        <article class="weight-row">
          <div>
            <h3>${escapeHtml(idea.title)}</h3>
            <p>${escapeHtml(idea.author)} · ${escapeHtml(idea.category)} · 建议分: ${idea.aiScore}分</p>
          </div>
          <div class="score-pill">${idea.aiScore}</div>
          <div class="weight-meter"><span style="width:${idea.aiScore}%"></span></div>
        </article>
      `
    )
    .join("");
}

/**
 * 渲染“发布入口”视窗
 */
function renderPublish() {
  document.querySelector("#publishUrl").value = state.publish.publishUrl;
  document.querySelector("#dinnerUrl").value = state.publish.dinnerUrl;
  document.querySelector("#audienceType").value = state.publish.audienceType;
  document.querySelector("#publishMessage").value = buildPublishMessage();
}

/**
 * 批量调用全部界面的渲染流程
 */
function renderAll() {
  renderTopbarBadge();
  renderMetrics();
  renderIdeas();
  renderLeaderboard();
  renderAdmin();
  renderIntent();
  renderAIPlan();
  renderPublish();
}

/**
 * 渲染保存并触发总页面重绘
 */
function saveAndRender() {
  if (isOffline) {
    saveLocalState();
  }
  renderAll();
}

/**
 * HTML 转义函数，防XSS注入
 * @param {string} value 原始字符串
 * @returns {string} 转义后字符串
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * 初始化绑定所有交互事件
 */
function initEventListeners() {
  // Tab 按钮切换事件
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  // 管理视窗解锁按钮事件绑定
  document.querySelectorAll(".unlock-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activeTab = document.querySelector('.tab.active');
      const targetView = activeTab ? activeTab.dataset.view : 'admin';
      
      showAdminLoginModal(() => {
        // 解锁成功后渲染对应视图
        setView(targetView);
        renderTopbarBadge();
      });
    });
  });

  // 点子广场筛选及排序机制
  document.querySelector("#categoryFilter").addEventListener("change", renderIdeas);
  document.querySelector("#sortMode").addEventListener("change", renderIdeas);

  // 投稿表单提交事件
  document.querySelector("#ideaForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = {
      author: document.querySelector("#author").value.trim(),
      role: document.querySelector("#role").value.trim(),
      title: document.querySelector("#title").value.trim(),
      category: document.querySelector("#category").value,
      phase: document.querySelector("#phase").value,
      content: document.querySelector("#content").value.trim()
    };

    if (isOffline) {
      // 离线模式本地生成打分
      const idea = {
        id: `idea-${Date.now()}`,
        ...data,
        votes: 0,
        adoptedPoints: 0,
        fullPlan: false,
        comments: [],
        createdAt: new Date().toISOString()
      };
      
      const mockResult = runLocalMockAi(idea);
      idea.aiScore = mockResult.aiScore;
      idea.aiReview = mockResult.aiReview;
      idea.breakdown = mockResult.breakdown;

      state.ideas.unshift(idea);
      event.target.reset();
      saveAndRender();
      setView("ideas");
    } else {
      try {
        const response = await fetch('/api/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const newIdea = await response.json();
          state.ideas.unshift(newIdea);
          event.target.reset();
          renderAll();
          setView("ideas");
        }
      } catch (err) {
        console.error('向后端提交创意出错:', err);
      }
    }
  });

  // 发起人想法表单提交事件
  document.querySelector("#intentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = {
      purpose: document.querySelector("#intentPurpose").value.trim(),
      outcome: document.querySelector("#intentOutcome").value.trim(),
      resources: document.querySelector("#intentResources").value.trim(),
      keywords: document.querySelector("#intentKeywords").value.trim()
    };

    if (isOffline) {
      state.intent = data;
      saveAndRender();
      setView("ai-plan");
    } else {
      try {
        const response = await fetch('/api/configs/intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': sessionStorage.getItem('admin_key')
          },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          state.intent = await response.json();
          // 更新策划撮合
          renderAll();
          setView("ai-plan");
        } else {
          alert('保存失败，请检查管理员权限。');
        }
      } catch (err) {
        console.error('向后端保存发起人想法异常:', err);
      }
    }
  });

  // AI 智能策划重新生成按钮
  document.querySelector("#refreshPlanBtn").addEventListener("click", () => {
    renderAIPlan();
  });

  // 发布入口生成文案
  document.querySelector("#publishForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.publish = {
      publishUrl: document.querySelector("#publishUrl").value.trim(),
      dinnerUrl: document.querySelector("#dinnerUrl").value.trim(),
      audienceType: document.querySelector("#audienceType").value
    };
    
    // 保存本地 publish 选项记录
    localStorage.setItem(STORAGE_KEY + '_pub', JSON.stringify(state.publish));
    renderPublish();
  });

  // 复制发布公告文案
  document.querySelector("#copyPublishBtn").addEventListener("click", async () => {
    const text = document.querySelector("#publishMessage").value;
    const status = document.querySelector("#copyStatus");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "已复制，可直接粘贴到飞书群公告。";
    } catch {
      status.textContent = "浏览器未允许自动复制，请手动选中文案复制。";
    }
  });

  // 数据导出
  document.querySelector("#exportBtn").addEventListener("click", () => {
    document.querySelector("#exportBox").value = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        activityInfo: {
          date: "2026-09-03",
          city: "成都",
          totalPeople: 500,
          dinnerPeople: 30,
          dinnerAaPrice: 198,
          schedule: [
            "09:00-12:00 上午主论坛",
            "12:00-13:30 自助餐交流",
            "13:30-17:30 下午决赛与专题分享，含90分钟热场活动和问题解答",
            "18:00-20:00 AIAA晚餐"
          ]
        },
        intent: state.intent,
        publish: state.publish,
        ideas: state.ideas,
        leaderboard: aggregatePeople(),
        aiPlan: generatePlan()
      },
      null,
      2
    );
  });

  // 恢复演示数据
  document.querySelector("#resetDemoBtn").addEventListener("click", async () => {
    if (confirm("确认恢复到初始化的演示数据吗？当前所有自定义投稿都将清空。")) {
      if (isOffline) {
        state.ideas = [];
        state.intent = structuredClone(defaultIntent);
        saveLocalState();
        renderAll();
        document.querySelector("#exportBox").value = "";
      } else {
        try {
          const response = await fetch('/api/admin/reset', {
            method: 'POST',
            headers: { 'X-Admin-Key': sessionStorage.getItem('admin_key') }
          });
          if (response.ok) {
            await loadAllData();
            renderAll();
            document.querySelector("#exportBox").value = "";
          } else {
            alert('恢复演示数据失败，口令校验未通过。');
          }
        } catch (err) {
          console.error('向后端重置演示数据异常:', err);
        }
      }
    }
  });

  // ================= 管理员身份登录框交互 =================

  // 关闭模态框
  document.querySelector("#closeAdminModalBtn").addEventListener("click", () => {
    closeAdminLoginModal();
  });

  // 提交验证口令
  document.querySelector("#adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwdInput = document.querySelector("#adminPassword");
    const errorMsg = document.querySelector("#adminLoginError");
    const val = pwdInput.value.trim();

    if (!val) return;

    if (isOffline) {
      // 离线模式使用固定口令验证
      if (val === 'huizhi2026') {
        sessionStorage.setItem('admin_key', val);
        const cb = activeAdminCallback;
        closeAdminLoginModal();
        if (cb) cb();
      } else {
        errorMsg.textContent = '验证失败，口令不正确 (离线默认口令为 huizhi2026)';
      }
    } else {
      // 在线模式请求后端进行校验
      try {
        // 利用获取 intent 接口，并在 headers 携带 key 进行鉴权校验
        const response = await fetch('/api/configs/intent', {
          headers: { 'X-Admin-Key': val }
        });
        if (response.ok) {
          sessionStorage.setItem('admin_key', val);
          const cb = activeAdminCallback;
          closeAdminLoginModal();
          if (cb) cb();
        } else {
          errorMsg.textContent = '验证失败，管理员口令不正确';
        }
      } catch (err) {
        errorMsg.textContent = '无法连接到后端服务器，口令验证失败';
      }
    }
  });
}

/**
 * 监听路由哈希并激活对应 Tab 视图
 */
function applyHashView() {
  const currentView = location.hash.replace("#", "");
  if (validViews.includes(currentView)) {
    setView(currentView);
  }
}

// 侦听哈希跳转
window.addEventListener("hashchange", applyHashView);
