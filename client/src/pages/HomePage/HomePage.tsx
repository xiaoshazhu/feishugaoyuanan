import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import './HomePage.css';

const STORAGE_KEY = "gaoyuan-ai-huizhi-box-v1";
const validViews = ["ideas", "info", "submit", "publish", "leaderboard"];

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
  "现场执行"
];

const defaultIntent = {
  purpose: "高原安、字节跳动、海科科技共同发起，打造一场面向约500位企业核心人员的AI效率先锋活动，展示AI和飞书在企业管理中的实战价值，提升行业影响力并促进高质量商机转化。",
  outcome: "让企业主看见真实案例、愿意交流、愿意留下需求；让飞书效率先锋决赛形成传播亮点；让AIAA晚餐承接30位企业主深度交流；最终沉淀一份可执行、可传播、可复盘的总策划。",
  resources: "活动时间为2026年9月3日全天，地点成都，总人数约500人。上午9:00-12:00，12:00-13:30自助餐交流，下午13:30-17:30，间隙插入共90分钟热场活动和问题解答，18:00-20:00 AIAA晚餐，自愿AA报名，每人198元，约30人，主要针对企业主。现场若挂飞书名，不做直接商业售卖。",
  keywords: "AI企业管理,飞书效率,实战分享,效率先锋决赛,企业主,商机转化,客户信息收集,互动热场,问题解答,AIAA晚餐,字节跳动高级分享,合规,成都,500人"
};

function getDefaultEntryUrl() {
  const entryUrl = new URL("/feishu-entry", window.location.origin);
  entryUrl.hash = "";
  return entryUrl.href;
}

const defaultPublish = {
  publishUrl: "", // dynamically set below
  dinnerUrl: "",
  audienceType: "内部筹备成员"
};

const seedIdeas = [
  {
    id: "idea-001",
    author: "市场组",
    role: "活动统筹",
    title: "用汇智箱提前征集客户最想看的AI场景",
    category: "客户转化",
    phase: "预热宣传期",
    content: "邀请目标客户在报名页选择最关注的数字化场景，活动当天按热度安排案例顺序，会后销售按兴趣标签跟进。",
    votes: 18,
    adoptedPoints: 3,
    fullPlan: false,
    comments: ["可以和报名表字段打通。", "也适合给主持人口播引用。"],
    createdAt: "2026-06-26T15:00:00.000Z"
  },
  {
    id: "idea-002",
    author: "技术组",
    role: "案例负责人",
    title: "案例展示统一用真实业务前后对比",
    category: "精品案例",
    phase: "方案定稿前",
    content: "每个案例只讲三个画面：痛点、飞书/AI改造动作、效率结果。避免讲产品堆功能，让企业老板能一眼看到价值。",
    votes: 25,
    adoptedPoints: 4,
    fullPlan: true,
    comments: ["建议每个案例控制在8分钟。"],
    createdAt: "2026-06-26T15:20:00.000Z"
  },
  {
    id: "idea-003",
    author: "销售组",
    role: "商机推进",
    title: "AIAA晚餐设置行业圆桌座位卡",
    category: "AIAA晚餐",
    phase: "会后转化期",
    content: "晚餐不做硬销售，按行业和数字化痛点分桌，每桌放一张问题卡，由高原安同事引导客户互相交流。",
    votes: 12,
    adoptedPoints: 2,
    fullPlan: false,
    comments: [],
    createdAt: "2026-06-26T16:00:00.000Z"
  },
  {
    id: "idea-004",
    author: "品牌组",
    role: "宣发",
    title: "小红书和抖音预热做效率挑战短视频",
    category: "宣传推广",
    phase: "预热宣传期",
    content: "用30秒短视频展示一个AI工具让会议纪要、任务拆解、客户跟进提速，结尾引导报名线下分享大会。",
    votes: 9,
    adoptedPoints: 1,
    fullPlan: false,
    comments: ["注意不包装成独立产品。"],
    createdAt: "2026-06-26T16:08:00.000Z"
  }
];

interface Idea {
  id: string;
  author: string;
  role: string;
  title: string;
  category: string;
  phase: string;
  content: string;
  votes: number;
  adoptedPoints: number;
  fullPlan: boolean;
  comments: string[];
  createdAt: string;
}

interface Intent {
  purpose: string;
  outcome: string;
  resources: string;
  keywords: string;
}

interface Publish {
  publishUrl: string;
  dinnerUrl: string;
  audienceType: string;
}

export default function HomePage() {
  // Load initial state
  const [state, setState] = useState<{
    ideas: Idea[];
    intent: Intent;
    publish: Publish;
  }>(() => {
    const defaultPubWithUrl = { ...defaultPublish, publishUrl: getDefaultEntryUrl() };
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      return {
        ideas: seedIdeas,
        intent: defaultIntent,
        publish: defaultPubWithUrl
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        ideas: Array.isArray(parsed.ideas) ? parsed.ideas : seedIdeas,
        intent: { ...defaultIntent, ...parsed.intent },
        publish: { ...defaultPubWithUrl, ...parsed.publish }
      };
    } catch {
      return {
        ideas: seedIdeas,
        intent: defaultIntent,
        publish: defaultPubWithUrl
      };
    }
  });

  const [activeView, setActiveView] = useState("ideas");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [sortMode, setSortMode] = useState("hot");

  // Multi-table config state from Bitable
  const [bootstrapConfig, setBootstrapConfig] = useState<any>({
    basicInfo: null,
    flow: [],
    templates: [],
    awards: [],
    rules: [],
    infoConfig: null,
    sponsors: []
  });

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // Form states
  const [newIdea, setNewIdea] = useState({
    author: "",
    role: "",
    title: "",
    category: categories[0],
    phase: "方案定稿前",
    content: ""
  });
  const [intentInput, setIntentInput] = useState<Intent>({ ...state.intent });
  const [publishInput, setPublishInput] = useState<Publish>({ ...state.publish });
  const [copyStatus, setCopyStatus] = useState("");
  const [exportBoxValue, setExportBoxValue] = useState("");
  
  // 新增：全局 Toast 与点赞动画状态
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'success' | 'info' }>({ message: '', visible: false });
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [votingIds, setVotingIds] = useState<string[]>([]);
  const [unvotedIds, setUnvotedIds] = useState<string[]>([]);

  // 新增：共创人员登录/实名登记状态
  const [userInfo, setUserInfo] = useState<{ name: string; department: string } | null>(() => {
    try {
      const cached = localStorage.getItem("gaoyuanan_user_info");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [regName, setRegName] = useState("");
  const [regDept, setRegDept] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState("");

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = regName.trim();
    const dept = regDept.trim();
    if (!name || !dept) {
      setRegError("请填写完整的姓名与所属单位");
      return;
    }
    
    setIsRegistering(true);
    setRegError("");
    try {
      const res = await axiosForBackend({
        url: "/api/huizhi/members",
        method: "POST",
        data: { name, department: dept }
      });
      
      if (res.data?.success) {
        const info = { name, department: dept };
        localStorage.setItem("gaoyuanan_user_info", JSON.stringify(info));
        setUserInfo(info);
        showToast(`登记成功！欢迎您，${name}。`);
      } else {
        setRegError("登记失败，请稍后重试");
      }
    } catch (err) {
      console.error(err);
      setRegError("网络异常，登记未成功");
    } finally {
      setIsRegistering(false);
    }
  };

  // 当登记共创人成功后，自动给 newIdea 表单赋值
  useEffect(() => {
    if (userInfo) {
      setNewIdea((prev) => ({
        ...prev,
        author: userInfo.name,
        role: userInfo.department
      }));
    }
  }, [userInfo]);
  
  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, visible: true, type });
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Save state on update
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const refreshAllData = useCallback(() => {
    // 1. 获取 ideas
    axiosForBackend({
      url: "/api/huizhi/ideas",
      method: "GET"
    }).then((res) => {
      if (Array.isArray(res.data)) {
        setState((prev) => ({
          ...prev,
          ideas: res.data
        }));
      }
    }).catch((err) => {
      console.error("Failed to fetch ideas:", err);
    });

    // 2. 获取 bootstrap
    axiosForBackend({
      url: "/api/huizhi/bootstrap",
      method: "GET"
    }).then((res) => {
      if (res.data) {
        setBootstrapConfig(res.data);
        if (res.data.infoConfig) {
          const cfg = res.data.infoConfig;
          const matchedKeywords = cfg['智能策划偏好'] || cfg['智能策划偏好关键词'] || '';
          setState((prev) => ({
            ...prev,
            intent: {
              purpose: cfg['主办方核心目的'] || '',
              outcome: cfg['希望达成的效果'] || '',
              resources: cfg['投入资源与边界'] || '',
              keywords: matchedKeywords
            }
          }));
          setIntentInput({
            purpose: cfg['主办方核心目的'] || '',
            outcome: cfg['希望达成的效果'] || '',
            resources: cfg['投入资源与边界'] || '',
            keywords: matchedKeywords
          });
        }
      }
    }).catch((err) => {
      console.error("Failed to fetch bootstrap config:", err);
    });

    // 3. 获取 leaderboard
    axiosForBackend({
      url: "/api/huizhi/leaderboard",
      method: "GET"
    }).then((res) => {
      if (Array.isArray(res.data)) {
        setLeaderboardData(res.data);
      }
    }).catch((err) => {
      console.error("Failed to fetch leaderboard data:", err);
    });
  }, []);

  // Load from backend on mount
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Sync hash to activeView
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const changeView = (view: string) => {
    setActiveView(view);
    window.history.replaceState(null, "", `#${view}`);
  };

  // Helper calculation functions
  const scoreIdea = useCallback((idea: Idea) => {
    return 1 + idea.votes * 0.2 + idea.adoptedPoints * 5 + (idea.fullPlan ? 20 : 0);
  }, []);

  const aggregatePeople = useCallback(() => {
    const peopleMap = new Map<string, {
      author: string;
      role: string;
      ideas: number;
      votes: number;
      adoptedPoints: number;
      fullPlans: number;
      score: number;
    }>();

    state.ideas.forEach((idea) => {
      const key = idea.author.trim();
      const current = peopleMap.get(key) || {
        author: idea.author,
        role: idea.role,
        ideas: 0,
        votes: 0,
        adoptedPoints: 0,
        fullPlans: 0,
        score: 0
      };
      current.ideas += 1;
      current.votes += idea.votes;
      current.adoptedPoints += idea.adoptedPoints;
      current.fullPlans += idea.fullPlan ? 1 : 0;
      current.score += scoreIdea(idea);
      peopleMap.set(key, current);
    });

    return [...peopleMap.values()].sort((a, b) => b.score - a.score);
  }, [state.ideas, scoreIdea]);

  const tokenizeIntent = useCallback(() => {
    return state.intent.keywords
      .split(/[,，、\s]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [state.intent.keywords]);

  const scoreIdeaForPlan = useCallback((idea: Idea) => {
    const text = `${idea.title} ${idea.category} ${idea.phase} ${idea.content}`;
    const keywords = tokenizeIntent();
    const matched = keywords.filter((k) => text.includes(k));
    
    const intentAllText = `${state.intent.purpose} ${state.intent.outcome} ${state.intent.resources} ${state.intent.keywords}`;
    if (intentAllText.includes(idea.category) && !matched.includes(idea.category)) {
      matched.push(idea.category);
    }
    const themeBoost = ["精品案例", "互动体验", "客户转化", "AIAA晚餐", "合规边界"].includes(idea.category) ? 12 : 6;
    const adoptionBoost = idea.adoptedPoints * 8 + (idea.fullPlan ? 18 : 0);
    const crowdBoost = Math.min(18, idea.votes * 0.7 + idea.comments.length * 1.8);
    const keywordScore = Math.min(38, matched.length * 7);
    const feasibility = idea.phase === "活动当天" || idea.phase === "方案定稿前" ? 12 : 8;
    const score = Math.min(100, Math.round(themeBoost + adoptionBoost + crowdBoost + keywordScore + feasibility));
    return {
      ...idea,
      aiScore: score,
      matchedKeywords: matched,
      planWeight: 0
    };
  }, [state.intent, tokenizeIntent]);

  const generatePlan = useCallback(() => {
    const ranked = state.ideas.map(scoreIdeaForPlan).sort((a, b) => b.aiScore - a.aiScore);
    const selected = ranked.slice(0, Math.min(6, ranked.length));
    const scoreTotal = selected.reduce((sum, idea) => sum + idea.aiScore, 0) || 1;
    selected.forEach((idea) => {
      idea.planWeight = Math.round((idea.aiScore / scoreTotal) * 100);
    });
    const themes = [...new Set(selected.map((idea) => idea.category))].slice(0, 5);
    return {
      title: "高原安AI效率先锋分享大会全天总策划草案",
      ranked,
      selected,
      themes,
      keywords: tokenizeIntent().slice(0, 14)
    };
  }, [state.ideas, scoreIdeaForPlan, tokenizeIntent]);

  const buildPublishMessage = useCallback((publishState: Publish) => {
    const url = publishState.publishUrl || "【请填写正式入口链接】";
    const dinner = publishState.dinnerUrl ? `\nAIAA晚餐报名链接：\n${publishState.dinnerUrl}\n` : "";
    const audienceLine =
      publishState.audienceType === "企业主与高管"
        ? "本次重点邀请企业主、高管、企业二代及数字化转型核心人员参与。"
        : publishState.audienceType === "合作伙伴"
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
  }, []);

  // Filtered and sorted ideas
  const visibleIdeas = useMemo(() => {
    let list = [...state.ideas];
    if (categoryFilter !== "全部") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    if (sortMode === "new") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortMode === "hot") {
      list.sort((a, b) => (b.votes + b.comments.length) - (a.votes + a.comments.length));
    } else if (sortMode === "score") {
      list.sort((a, b) => scoreIdea(b) - scoreIdea(a));
    }
    return list;
  }, [state.ideas, categoryFilter, sortMode, scoreIdea]);

  // Actions
  const handleVote = (id: string) => {
    if (votingIds.includes(id)) return;
    setVotingIds((prev) => [...prev, id]);

    const authorName = userInfo?.name || "匿名";
    const deptName = userInfo?.department || "";
    
    const targetIdea = state.ideas.find(x => x.id === id);
    if (!targetIdea) {
      setVotingIds((prev) => prev.filter(x => x !== id));
      return;
    }
    
    // 判定是否已经点过赞
    const hasVoted = targetIdea.interactions?.some(x => x.user === authorName && x.type === "点赞");

    // 1. 触发 Q弹动效 (已点赞则触发收缩动画，未点赞则触发膨胀动画)
    if (hasVoted) {
      setUnvotedIds((prev) => [...prev, id]);
      setTimeout(() => {
        setUnvotedIds((prev) => prev.filter(x => x !== id));
      }, 1000);
    } else {
      setVotedIds((prev) => [...prev, id]);
      setTimeout(() => {
        setVotedIds((prev) => prev.filter(x => x !== id));
      }, 1000);
    }

    // 2. 乐观双向切换本地状态
    setState((prev) => {
      const newIdeas = prev.ideas.map((idea) => {
        if (idea.id === id) {
          let newInteractions = [];
          let newVotes = idea.votes;
          if (hasVoted) {
            newVotes = Math.max(0, idea.votes - 1);
            newInteractions = (idea.interactions || []).filter(
              x => !(x.user === authorName && x.type === "点赞")
            );
          } else {
            newVotes = idea.votes + 1;
            newInteractions = [
              ...(idea.interactions || []),
              { user: authorName, type: "点赞", content: "" }
            ];
          }
          return {
            ...idea,
            votes: newVotes,
            interactions: newInteractions
          };
        }
        return idea;
      });
      return { ...prev, ideas: newIdeas };
    });

    if (hasVoted) {
      showToast("点赞已取消", "info");
    } else {
      showToast("点赞成功！感谢您的共创。");
    }

    // 3. 静默网络请求，传入姓名及所属单位，完成后释放锁
    axiosForBackend({
      url: `/api/huizhi/ideas/${id}/vote`,
      method: "POST",
      data: { author: authorName, department: deptName }
    }).then((res) => {
      if (res.data?.success) {
        refreshAllData();
      }
    }).catch((err) => {
      console.error("Failed to vote for idea:", err);
    }).finally(() => {
      setVotingIds((prev) => prev.filter(x => x !== id));
    });
  };

  const handleAddComment = (id: string, text: string) => {
    if (!text.trim()) return;
    const authorName = userInfo?.name || "匿名";

    // 1. 乐观更新本地状态 (将评论立刻插入弹幕流和本地 comments)
    setState((prev) => {
      const newIdeas = prev.ideas.map((idea) => {
        if (idea.id === id) {
          const newInteractions = [
            ...(idea.interactions || []),
            { user: authorName, type: "评论", content: text.trim() }
          ];
          const newComments = [
            ...(idea.comments || []),
            `${authorName}: ${text.trim()}`
          ];
          return {
            ...idea,
            comments: newComments,
            interactions: newInteractions
          };
        }
        return idea;
      });
      return { ...prev, ideas: newIdeas };
    });

    showToast("发表评论成功！已同步至互动中心。");

    // 2. 静默网络请求
    axiosForBackend({
      url: `/api/huizhi/ideas/${id}/comment`,
      method: "POST",
      data: { commentText: text.trim(), author: authorName, department: userInfo?.department || "" }
    }).then((res) => {
      if (res.data?.comments) {
        showToast("发表评论成功！已同步至互动中心。");
        refreshAllData();
      } else {
        showToast("评论失败，请重试", "info");
      }
    }).catch((err) => {
      console.error("Failed to add comment:", err);
      showToast("发表评论失败", "info");
    });
  };

  const handleIdeaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      author: newIdea.author.trim(),
      role: newIdea.role.trim(),
      title: newIdea.title.trim(),
      category: newIdea.category,
      phase: newIdea.phase,
      content: newIdea.content.trim()
    };
    axiosForBackend({
      url: "/api/huizhi/ideas",
      method: "POST",
      data: payload
    }).then((res) => {
      if (res.data) {
        setNewIdea({
          author: "",
          role: "",
          title: "",
          category: categories[0],
          phase: "方案定稿前",
          content: ""
        });
        changeView("ideas");
        refreshAllData();
      }
    }).catch((err) => {
      console.error("Failed to submit idea:", err);
    });
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setState((prev) => ({
      ...prev,
      publish: { ...publishInput }
    }));
  };

  const [isSavingIntent, setIsSavingIntent] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const handleIntentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIntent(true);
    setSaveStatus("正在保存并刷新中...");
    
    // 映射回后端对应的中文字段
    const payload = {
      '主办方核心目的': intentInput.purpose,
      '希望达成的效果': intentInput.outcome,
      '投入资源与边界': intentInput.resources,
      '智能策划偏好': intentInput.keywords,
    };

    axiosForBackend({
      url: "/api/huizhi/info-config",
      method: "PUT",
      data: payload
    }).then((res) => {
      if (res.data?.success) {
        setSaveStatus("保存成功！已同步至飞书多维表格。");
        // 重新拉取最新的数据
        refreshAllData();
      } else {
        setSaveStatus("保存失败，请稍后重试。");
      }
    }).catch((err) => {
      console.error("Failed to save intent config:", err);
      setSaveStatus("保存时出错，请检查网络或配置。");
    }).finally(() => {
      setIsSavingIntent(false);
      setTimeout(() => setSaveStatus(""), 4000);
    });
  };

  const copyPublishMessage = async () => {
    const message = buildPublishMessage(state.publish);
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus("已复制，可直接粘贴到飞书群公告。");
    } catch {
      setCopyStatus("浏览器未允许自动复制，请手动选中文案复制。");
    }
  };
  const totalIdeas = state.ideas.length;
  const totalAdoptedPoints = leaderboardData.reduce((sum, i) => sum + i.adoptedPoints, 0);
  const totalPeople = leaderboardData.length;

  const aiPlan = generatePlan();

  // Helper date/time formatters
  const formatTimestamp = (ts: any) => {
    if (!ts) return "";
    const date = new Date(ts);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatTimeRange = (start: any, end: any) => {
    if (!start) return "";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const pad = (n: number) => String(n).padStart(2, '0');
    
    const startTimeStr = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
    if (!endDate) return startTimeStr;
    const endTimeStr = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
    return `${startTimeStr}-${endTimeStr}`;
  };

  // Handle individual comment UI toggles
  const [commentViewToggle, setCommentViewToggle] = useState<Record<string, boolean>>({});
  const toggleCommentSection = (id: string) => {
    setCommentViewToggle((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="gaoyuanan-app">
      <header className="hero">
        <img src="/assets/hero-huizhi-box.png" alt="高原安A效率先锋汇智箱活动视觉" />
        <div className="hero-shade"></div>
        <nav className="topbar" aria-label="主导航">
          <strong>高原安A效率先锋汇智箱</strong>
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a className="ghost small nav-link" href="/feishu-entry">飞书入口</a>
            <button className="ghost small" onClick={() => changeView("info")}>活动信息</button>
            <button className="ghost small" onClick={() => changeView("ideas")}>点子广场</button>
            <button className="ghost small" onClick={() => changeView("submit")}>投放想法</button>
            {userInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.15)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', color: '#fff' }}>
                👤 <span>{userInfo.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("gaoyuanan_user_info");
                    setUserInfo(null);
                    setRegName("");
                    setRegDept("");
                    setNewIdea((prev) => ({ ...prev, author: "", role: "" }));
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    marginLeft: '4px'
                  }}
                >
                  重登
                </button>
              </div>
            )}
          </div>
        </nav>
        <section className="hero-copy">
          <p>高原安AI效率先锋分享大会 · 共创筹备工具</p>
          <h1>把每一个好点子，变成可采纳、可计分、可兑换的活动资产。</h1>
          <div className="hero-metrics" aria-label="活动关键指标">
            <span><b id="metricIdeas">{totalIdeas}</b>条建议</span>
            <span><b id="metricAdopted">{totalAdoptedPoints.toFixed(1)}</b>个采纳得分</span>
            <span><b id="metricPeople">{totalPeople}</b>位共创者</span>
          </div>
        </section>
      </header>

      <main>
        <section className="mission-band">
          <div>
            <h2>活动共创目标</h2>
            <p>
              {bootstrapConfig.infoConfig?.主办方核心目的 || 
                "围绕“高原安AI效率先锋分享大会”，征集营销推广、精品案例、互动体验、嘉宾邀请、客户转化、AIAA晚餐等建议。组委会按采纳点计分，积分公开展示，用奖品兑换激励更多人参与。"}
            </p>
          </div>
          <div className="deadline-strip">
            <span>方案定稿</span>
            <strong>2026.07.10 前</strong>
            <span>活动窗口</span>
            <strong>
              {bootstrapConfig.basicInfo?.活动时间 ? 
                formatTimestamp(bootstrapConfig.basicInfo.活动时间) : "2026.09.03"}
            </strong>
          </div>
        </section>

        <section className="feishu-band">
          <div>
            <span className="mini-label">飞书参与入口</span>
            <h2>从飞书群、工作台或多维表格进入汇智箱</h2>
            <p>适合放在活动筹备群公告、飞书工作台快捷入口、客户报名表提交后页面，也可以嵌入飞书文档作为共创入口。</p>
          </div>
          <a className="primary link-button" href="/feishu-entry">打开飞书入口页</a>
        </section>

        <section className="tabs" aria-label="视图切换">
          <button className={`tab ${activeView === 'ideas' ? 'active' : ''}`} onClick={() => changeView("ideas")}>点子广场</button>
          <button className={`tab ${activeView === 'info' ? 'active' : ''}`} onClick={() => changeView("info")}>活动信息</button>
          <button className={`tab ${activeView === 'intent' ? 'active' : ''}`} onClick={() => changeView("intent")}>发起人想法</button>
          <button className={`tab ${activeView === 'submit' ? 'active' : ''}`} onClick={() => changeView("submit")}>投放想法</button>
          <button className={`tab ${activeView === 'leaderboard' ? 'active' : ''}`} onClick={() => changeView("leaderboard")}>积分榜</button>
        </section>

        {/* View: info */}
        {activeView === "info" && (
          <section id="view-info" className="view active">
            <div className="section-head">
              <div>
                <h2>活动基本信息</h2>
                <p>用于约束所有投稿、智能策划和组委会采纳评分的基础盘。</p>
              </div>
            </div>
            <div className="info-layout">
              <article className="panel info-main">
                <span className="mini-label">
                  {bootstrapConfig.basicInfo?.活动时间 ? formatTimestamp(bootstrapConfig.basicInfo.活动时间) : "2026年9月3日"} · 
                  {bootstrapConfig.basicInfo?.活动地点 || "成都"} · 
                  约{bootstrapConfig.basicInfo?.规模估计 || "500"}人
                </span>
                <h2>{bootstrapConfig.basicInfo?.活动主题 || "AI运用于企业管理的实战分享暨飞书效率先锋决赛"}</h2>
                <p>{bootstrapConfig.basicInfo?.活动描述 || "面向企业主、高管、企业二代与数字化转型核心人员，围绕AI时代企业管理、飞书效率实践、案例决赛对决和未来设想展开全天活动。"}</p>
                <div className="info-stats">
                  <span><b>{bootstrapConfig.basicInfo?.规模估计 || "500"}</b>总人数约</span>
                  <span><b>{bootstrapConfig.basicInfo?.AIAA晚餐企业主席位 || "30"}</b>AIAA晚餐企业主席位</span>
                  <span><b>{bootstrapConfig.basicInfo?.['元/人自愿AA'] || "198"}</b>元/人自愿AA</span>
                </div>
              </article>
              <article className="panel schedule-panel">
                <h2>当天流程</h2>
                <ol className="timeline">
                  {bootstrapConfig.flow && bootstrapConfig.flow.length > 0 ? (
                    [...bootstrapConfig.flow]
                      .sort((a: any, b: any) => (a.流程开始时间 || 0) - (b.流程开始时间 || 0))
                      .map((item: any, idx: number) => (
                        <li key={idx}>
                          <strong>{formatTimeRange(item.流程开始时间, item.流程结束时间)}</strong>
                          <span>{item.流程描述}</span>
                        </li>
                      ))
                  ) : (
                    <>
                      <li><strong>09:00-12:00</strong><span>上午主论坛：AI与企业管理实战分享、飞书效率先锋展示。</span></li>
                      <li><strong>12:00-13:30</strong><span>自助餐与交流，承接上午内容并促进商机互动。</span></li>
                      <li><strong>13:30-17:30</strong><span>下午决赛与专题分享，中间插入共90分钟热场活动和问题解答。</span></li>
                      <li><strong>18:00-20:00</strong><span>AIAA晚餐，会中自愿AA制报名，每人198元，主要针对30位企业主深度交流。</span></li>
                    </>
                  )}
                </ol>
              </article>
            </div>
            <div className="theme-grid">
              {bootstrapConfig.templates && bootstrapConfig.templates.length > 0 ? (
                bootstrapConfig.templates.map((item: any, idx: number) => (
                  <article key={idx}>
                    <h3>{item.案例标题}</h3>
                    <p>{item.案例描述}</p>
                  </article>
                ))
              ) : (
                <>
                  <article><h3>AI运用于企业管理的实战分享</h3><p>展示真实企业管理场景中AI提效、降本、增收的实践方法。</p></article>
                  <article><h3>飞书效率先锋决赛对决</h3><p>用轻比赛、重展示的方式呈现内部精品案例和业务改造成果。</p></article>
                  <article><h3>AI时代企业管理经验交流</h3><p>让企业主围绕组织、流程、绩效、销售和客户经营展开交流。</p></article>
                  <article><h3>飞书应用未来与设想</h3><p>邀请字节跳动高级分享，讨论飞书应用于现代企业管理的未来方向。</p></article>
                </>
              )}
            </div>


          </section>
        )}


        {/* View: ideas */}
        {activeView === "ideas" && (
          <section id="view-ideas" className="view active">
            <div className="section-head">
              <div>
                <h2>点子广场</h2>
                <p>所有人都能看见、点赞、评论，让零散灵感沉淀成活动方案。</p>
              </div>
              <div className="filters">
                <select
                  id="categoryFilter"
                  aria-label="分类筛选"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="全部">全部分类</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  id="sortMode"
                  aria-label="排序方式"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                >
                  <option value="hot">热度优先</option>
                  <option value="new">最新优先</option>
                  <option value="score">采纳优先</option>
                </select>
              </div>
            </div>
            <div id="ideaList" className="idea-grid">
              {visibleIdeas.map((idea) => {
                const isCommentsOpen = !!commentViewToggle[idea.id];
                return (
                  <article key={idea.id} className="idea-card">
                    <div className="idea-top">
                      <span className="badge">{idea.category}</span>
                      <span className="phase">{idea.phase}</span>
                    </div>
                    <h3>{idea.title}</h3>
                    <p className="idea-content">{idea.content}</p>
                    {idea.fullPlan && (
                      <div className="adoption">
                        完整策划
                      </div>
                    )}
                    {/* 滚动弹幕区 - 3行不规则滑行弹幕 */}
                    <div className="danmaku-container-v2" style={{ height: '86px', position: 'relative', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.015)', borderRadius: '8px', marginTop: '14px', border: '1px dashed var(--border)', padding: '4px' }}>
                      {idea.interactions && idea.interactions.length > 0 ? (
                        idea.interactions.map((inter: any, itemIdx: number) => {
                          const rowIndex = itemIdx % 3; // 0, 1, 2 通道
                          const topPosition = `${4 + rowIndex * 26}px`; // 每行高度 26px
                          const speed = 7 + (itemIdx % 4) * 2; // 错开速度：7s, 9s, 11s, 13s
                          const delay = (itemIdx * 1.6) % 5;   // 错开延迟：0s, 1.6s, 3.2s, 4.8s...
                          
                          return (
                            <span
                              key={itemIdx}
                              className="danmaku-item-v2"
                              style={{
                                position: 'absolute',
                                top: topPosition,
                                animation: `danmaku-slide ${speed}s linear infinite`,
                                animationDelay: `${delay}s`,
                                whiteSpace: 'nowrap',
                                fontSize: '0.78rem',
                                background: 'var(--accent)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                color: 'var(--muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                              }}
                            >
                              {inter.type === '点赞' ? (
                                <>❤️ <strong>{inter.user}</strong> 点赞了此想法</>
                              ) : (
                                <>💬 <strong>{inter.user}</strong>：<span>{inter.content}</span></>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', height: '100%', paddingLeft: '8px' }}>
                          💡 暂无动态，点击下方按钮参与第一条互动！
                        </span>
                      )}
                    </div>

                    <div className="card-actions">
                      {(() => {
                        const authorName = userInfo?.name || "匿名";
                        const hasVoted = idea.interactions?.some((x: any) => x.user === authorName && x.type === "点赞");
                        const isProcessing = votingIds.includes(idea.id);
                        
                        return (
                          <button 
                            className={`vote-btn ${votedIds.includes(idea.id) ? 'voted-scale' : ''} ${unvotedIds.includes(idea.id) ? 'unvote-scale' : ''} ${hasVoted ? 'voted-active' : ''}`} 
                            type="button" 
                            disabled={isProcessing}
                            style={{ 
                              pointerEvents: isProcessing ? 'none' : 'auto', 
                              opacity: isProcessing ? 0.75 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }} 
                            onClick={() => handleVote(idea.id)}
                          >
                            <span>{hasVoted ? '❤️' : '🤍'}</span>
                            <span>点赞 {idea.votes}</span>
                          </button>
                        );
                      })()}
                      <button className="comment-toggle" type="button" onClick={() => toggleCommentSection(idea.id)}>
                        参与互动
                      </button>
                    </div>
                    {isCommentsOpen && (
                      <form
                        className="comment-inline-form"
                        style={{ display: 'flex', gap: '8px', marginTop: '12px', padding: '8px 12px', background: 'var(--accent)', borderRadius: '6px', border: '1px solid var(--border)' }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const input = form.querySelector('input') as HTMLInputElement;
                          handleAddComment(idea.id, input.value);
                          input.value = "";
                          toggleCommentSection(idea.id);
                        }}
                      >
                        <input
                          placeholder="写下你对该想法的互动建议..."
                          required
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: '6px 16px',
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          发送
                        </button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* View: submit */}
        {activeView === "submit" && (
          <section id="view-submit" className="view active">
            <div className="form-layout">
              <form id="ideaForm" className="panel" onSubmit={handleIdeaSubmit}>
                <h2>投放你的想法</h2>
                <div className="field-row" style={{ display: 'none' }}>
                  <input id="author" value={newIdea.author} readOnly />
                  <input id="role" value={newIdea.role} readOnly />
                </div>
                <div style={{ marginBottom: '18px', fontSize: '0.9rem', color: 'var(--muted)', background: 'var(--accent)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border)', lineHeight: '1.5' }}>
                  💡 您当前正以共创人：<strong>{userInfo?.name}</strong>（所属部门/单位：<strong>{userInfo?.department}</strong>）的身份提交想法。如需修改，请清理浏览器缓存后刷新登记。
                </div>
                <label>
                  建议标题
                  <input
                    id="title"
                    required
                    maxLength={40}
                    placeholder="一句话说清楚你的主张"
                    value={newIdea.title}
                    onChange={(e) => setNewIdea((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </label>
                <label>
                  建议分类
                  <select
                    id="category"
                    required
                    value={newIdea.category}
                    onChange={(e) => setNewIdea((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  具体内容
                  <textarea
                    id="content"
                    required
                    rows={7}
                    placeholder="可以写一个小建议，也可以写完整策划。建议包含：场景、做法、需要资源、预期效果。"
                    value={newIdea.content}
                    onChange={(e) => setNewIdea((prev) => ({ ...prev, content: e.target.value }))}
                  />
                </label>
                <label>
                  可落地时间段
                  <select
                    id="phase"
                    required
                    value={newIdea.phase}
                    onChange={(e) => setNewIdea((prev) => ({ ...prev, phase: e.target.value }))}
                  >
                    <option value="方案定稿前">方案定稿前</option>
                    <option value="预热宣传期">预热宣传期</option>
                    <option value="活动当天">活动当天</option>
                    <option value="会后转化期">会后转化期</option>
                  </select>
                </label>
                <button className="primary" type="submit">投进汇智箱</button>
              </form>

              <aside className="panel reward-panel">
                <h2>计分规则</h2>
                <ul>
                  {bootstrapConfig.rules && bootstrapConfig.rules.length > 0 ? (
                    bootstrapConfig.rules.map((rule: any, idx: number) => (
                      <li key={idx}>
                        <strong>{rule.积分规则}</strong>
                        <span>{Number(rule.分数变动) > 0 ? `+${rule.分数变动}` : rule.分数变动} 分</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li><strong>提交</strong><span>+1 分</span></li>
                      <li><strong>被点赞</strong><span>+0.2 分/赞</span></li>
                      <li><strong>采纳点</strong><span>+5 分/点</span></li>
                      <li><strong>完整策划被采用</strong><span>+20 分</span></li>
                    </>
                  )}
                </ul>
                <h3>奖品兑换</h3>
                {bootstrapConfig.awards && bootstrapConfig.awards.length > 0 ? (
                  <p>
                    {bootstrapConfig.awards.map((award: any) => `${award.所需积分}分兑换${award.奖品名称}`).join('，')}。
                  </p>
                ) : (
                  <p>30分兑换活动伴手礼，60分兑换定制纪念杯，100分兑换AI效率工具会员或晚餐交流席位优先权。</p>
                )}
              </aside>
            </div>
          </section>
        )}

        {/* View: intent (发起人想法) */}
        {activeView === "intent" && (
          <section id="view-intent" className="view active">
            <div className="section-head">
              <div>
                <h2>发起人想法</h2>
                <p>由高原安、字节跳动、海科科技共同发起，所有投稿都围绕这里的目标自动匹配。</p>
              </div>
            </div>

            <form onSubmit={handleIntentSubmit} className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="intent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '20px' }}>
                
                <div className="intent-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem', color: 'var(--foreground)' }}>主办方核心目的</label>
                  <textarea
                    rows={6}
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical', lineHeight: '1.6' }}
                    value={intentInput.purpose}
                    onChange={(e) => setIntentInput((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder="请输入主办方核心目的..."
                  />
                </div>

                <div className="intent-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem', color: 'var(--foreground)' }}>希望达成的效果</label>
                  <textarea
                    rows={6}
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical', lineHeight: '1.6' }}
                    value={intentInput.outcome}
                    onChange={(e) => setIntentInput((prev) => ({ ...prev, outcome: e.target.value }))}
                    placeholder="请输入希望达成的效果..."
                  />
                </div>

                <div className="intent-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem', color: 'var(--foreground)' }}>投入资源与边界</label>
                  <textarea
                    rows={6}
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical', lineHeight: '1.6' }}
                    value={intentInput.resources}
                    onChange={(e) => setIntentInput((prev) => ({ ...prev, resources: e.target.value }))}
                    placeholder="请输入投入资源与边界条件..."
                  />
                </div>

                <div className="intent-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem', color: 'var(--foreground)' }}>智能策划偏好关键词</label>
                  <textarea
                    rows={6}
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical', lineHeight: '1.6' }}
                    value={intentInput.keywords}
                    onChange={(e) => setIntentInput((prev) => ({ ...prev, keywords: e.target.value }))}
                    placeholder="请输入智能策划偏好关键词，多个词之间用逗号分隔..."
                  />
                </div>

              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  type="submit"
                  disabled={isSavingIntent}
                  className="primary"
                  style={{
                    backgroundColor: '#076046',
                    color: '#fff',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSavingIntent ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSavingIntent ? '正在保存...' : '保存发起人想法并刷新智能策划'}
                </button>
                {saveStatus && (
                  <span style={{ fontSize: '0.9rem', color: saveStatus.includes('成功') ? '#10b981' : '#f59e0b', fontWeight: '500' }}>
                    {saveStatus}
                  </span>
                )}
              </div>
            </form>

            {/* 联合发起人职责展示 */}
            <div className="sponsor-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {bootstrapConfig.sponsors && bootstrapConfig.sponsors.length > 0 ? (
                bootstrapConfig.sponsors.map((item: any, idx: number) => (
                  <div key={idx} className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{item.企业名称}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>{item.企业描述}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>高原安</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>总发起、客户经营、企业管理实战案例、AIAA晚餐转化。</p>
                  </div>
                  <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>字节跳动</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>飞书站台、高级分享、数字化应用未来设想、原厂背书。</p>
                  </div>
                  <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>海科科技</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>活动策划执行、客户邀约、现场互动、内容包装与传播。</p>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* View: leaderboard */}
        {activeView === "leaderboard" && (
          <section id="view-leaderboard" className="view active">
            <div className="section-head">
              <div>
                <h2>积分榜</h2>
                <p>公开透明，直接对接多维表格人员榜，让“参与感”变成持续动力。</p>
              </div>
            </div>
            <div id="leaderboard" className="leaderboard">
              {leaderboardData && leaderboardData.length > 0 ? (
                leaderboardData.map((person, index) => (
                  <article key={person.id || index} className="leader-row" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="rank">{index + 1}</span>
                    {person.avatarUrl && (
                      <img 
                        src={person.avatarUrl} 
                        alt={person.author} 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', marginRight: '12px', border: '1px solid var(--border)' }} 
                      />
                    )}
                    <div>
                      <h3>{person.author} <small>{person.role || '共创先锋'}</small></h3>
                      <p className="muted">
                        {person.ideas}条建议 · {person.adoptedPoints.toFixed(1)}分得分情况
                      </p>
                    </div>
                    <strong className="leader-score">{person.score.toFixed(1)} 分</strong>
                  </article>
                ))
              ) : (
                <p>暂无排行榜数据</p>
              )}
            </div>
          </section>
        )}


      </main>

      {/* 全局 Toast 通知弹窗 */}
      {toast.visible && (
        <div
          className="toast-popup"
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toast.type === 'success' ? '#076046' : 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '12px 28px',
            borderRadius: '50px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            animation: 'toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}
        >
          {toast.type === 'success' ? '✨' : 'ℹ️'} {toast.message}
        </div>
      )}

      {/* 磨砂玻璃质感共创人身份登记遮罩 Modal */}
      {!userInfo && (
        <div
          className="registration-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(7, 96, 70, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <form
            onSubmit={handleRegisterSubmit}
            className="panel registration-card"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '40px 32px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              background: 'var(--background)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: 'rgba(7, 96, 70, 0.1)',
                  color: '#076046',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  marginBottom: '12px'
                }}
              >
                高效协同 · 汇智共创
              </span>
              <h2 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--foreground)', fontWeight: 'bold' }}>共创人身份登记</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '8px', lineHeight: '1.6' }}>
                请登记您的真实姓名与所属单位，开始您的 AI 效率想法共创之旅。
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                人员名称 (真实姓名)
                <input
                  type="text"
                  required
                  placeholder="请输入您的真实姓名"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                所属单位 (部门/公司)
                <input
                  type="text"
                  required
                  placeholder="例如：技术部 / 海科科技"
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s',
                  }}
                />
              </label>
            </div>

            {regError && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                ⚠️ {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              style={{
                width: '100%',
                padding: '14px',
                background: '#076046',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: isRegistering ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(7, 96, 70, 0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              {isRegistering ? '正在登记注册...' : '开启共创箱'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
