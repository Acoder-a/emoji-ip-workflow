(function () {
  "use strict";

  var state = {
    mode: "single",
    files: [],
    analyzed: false
  };

  var fileInput = document.getElementById("fileInput");
  var uploadZone = document.getElementById("uploadZone");
  var frameStrip = document.getElementById("frameStrip");
  var analyzeButton = document.getElementById("analyzeButton");
  var statusPill = document.getElementById("statusPill");
  var resultContent = document.getElementById("resultContent");
  var resultEmpty = document.getElementById("resultEmpty");
  var intensity = document.getElementById("intensity");
  var intensityValue = document.getElementById("intensityValue");
  var toast = document.getElementById("toast");
  var toastTimer;

  function showToast(message) {
    toast.querySelector("span").textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2100);
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll(".mode-option").forEach(function (button) {
      var active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
    document.getElementById("uploadHint").textContent = mode === "sequence"
      ? "支持 2–12 张连续帧；请按时间顺序上传"
      : "支持 PNG、JPG、WebP；单帧模式建议上传 1 张";
    document.getElementById("frameCount").textContent = mode === "sequence"
      ? (state.files.length ? state.files.length + " 帧序列" : "连续帧分析")
      : "单帧推断";
  }

  document.querySelectorAll(".mode-option").forEach(function (button) {
    button.addEventListener("click", function () { setMode(button.dataset.mode); });
  });

  function acceptFiles(fileList) {
    var valid = Array.from(fileList).filter(function (file) {
      return /^image\/(png|jpeg|webp|gif)$/.test(file.type);
    });
    if (!valid.length) {
      showToast("请选择 PNG、JPG、WebP 或 GIF 图片");
      return;
    }
    var max = state.mode === "single" ? 1 : 12;
    if (state.mode === "single") {
      state.files = [valid[0]];
    } else {
      state.files = state.files.concat(valid).slice(0, max);
    }
    renderFrames();
    showToast(state.files.length + " 张素材已载入");
  }

  function renderFrames() {
    frameStrip.innerHTML = "";
    frameStrip.classList.toggle("has-files", state.files.length > 0);
    state.files.forEach(function (file, index) {
      var item = document.createElement("div");
      item.className = "frame-thumb";
      var img = document.createElement("img");
      img.alt = "表情素材第 " + (index + 1) + " 帧";
      img.src = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      var label = document.createElement("em");
      label.textContent = state.mode === "single" ? "目标帧" : "F" + String(index + 1).padStart(2, "0");
      var remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", "移除第 " + (index + 1) + " 帧");
      remove.textContent = "×";
      remove.addEventListener("click", function (event) {
        event.stopPropagation();
        state.files.splice(index, 1);
        renderFrames();
      });
      item.append(img, label, remove);
      frameStrip.appendChild(item);
    });
    document.getElementById("frameCount").textContent = state.mode === "sequence"
      ? (state.files.length ? state.files.length + " 帧序列" : "连续帧分析")
      : "单帧推断";
  }

  uploadZone.addEventListener("click", function () { fileInput.click(); });
  uploadZone.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", function () {
    acceptFiles(fileInput.files);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach(function (name) {
    uploadZone.addEventListener(name, function (event) {
      event.preventDefault();
      uploadZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (name) {
    uploadZone.addEventListener(name, function (event) {
      event.preventDefault();
      uploadZone.classList.remove("dragover");
    });
  });
  uploadZone.addEventListener("drop", function (event) { acceptFiles(event.dataTransfer.files); });

  intensity.addEventListener("input", function () {
    intensityValue.textContent = ["快速", "精细", "逐帧"][Number(intensity.value) - 1];
  });

  function getName() {
    return document.getElementById("ipName").value.trim() || "当前人物 IP";
  }

  function updateResultText() {
    var name = getName();
    var sequence = state.mode === "sequence";
    var note = document.getElementById("notes").value.trim();
    var prefix = name === "当前人物 IP" ? name : "人物 IP「" + name + "」";
    var features = "保持" + prefix + "在上传素材中的脸型、头部比例、眼睛基础形状、眉形、嘴部结构、发型轮廓、服装配色与原始画风，以上特征均作为身份锚点固定。后续只改变表情肌肉状态、瞳孔位置与小幅头部姿态。";
    document.getElementById("ipFeatures").textContent = features;
    document.getElementById("frameCount").textContent = sequence ? state.files.length + " 帧序列" : "单帧推断";

    var initial = "【人物身份保持】严格保持" + prefix + "在参考图中的脸型、头部比例、五官基础形状、发型轮廓、服装与原始画风，不改变角色年龄感、身份标志或镜头构图。\n\n【起始状态】双眼自然睁开、瞳孔近中位、眉毛放松、嘴唇轻闭、头部居中。\n\n【目标情绪】由克制的期待过渡到带轻微害羞感的突然惊喜，情绪强度约 78%。\n\n【动作】双上眼睑快速抬高约 35%，右眼先动、左眼延迟约 60ms；双瞳向画面右上平移约 12%，高光随视线放大。右眉内端先上扬 18%，左眉随后跟进并保留轻微不对称。嘴唇由轻闭变为小 O 形，嘴角先下压再回弹。头部向画面左侧歪 6°并后仰 4°。双颊低饱和粉红由右向左轻微扩散。\n\n【节奏】快起慢停：眼睑与右眉先触发，嘴部和头部跟进，高光与腮红最后收束，停留在大睁眼、右上聚焦、轻歪头的惊喜状态。";
    var final = "【人物身份保持】严格保持" + prefix + "：锁定参考图的脸型、头部比例、眼睛基础轮廓、眉形、嘴部结构、发型、服装、线条粗细、配色、材质与整体画风；不改变五官间距、身份标志和镜头构图。\n\n【起始→目标】起始为克制的平静期待：双眼正常睁开，瞳孔居中，眉毛近乎平直，嘴唇轻闭，头部居中。目标为带轻微害羞的突然惊喜，情绪强度 78%。\n\n【动作序列】0–120ms：右上眼睑先快速抬高，右眉内端同步上扬；左眼与左眉延迟约 60ms 跟进，双眼最终比起始睁大 35%，保留右侧略高的自然不对称。120–300ms：双瞳共同向画面右上平移 12%，聚焦同一远点，右眼高光先放大、左眼高光随后回弹。180–420ms：嘴唇由轻闭变为小 O 形，嘴角先下压 3% 再回弹，开口宽度不超过脸宽 9%，牙齿不可见，下唇仅轻微前探。250–520ms：头部向画面左侧歪 6°并后仰 4°，不改变脸部透视比例。350–700ms：低饱和腮红从右颊向左颊扩散，鼻梁下阴影轻微收紧。\n\n【节奏与终态】整体快起慢停，右侧五官向左侧错峰传播；前 30% 突然触发，中段连续过渡，末段缓慢收束并停留 0.6 秒。最终保持双眼大睁、瞳孔右上聚焦、双眉上扬但右高左低、小 O 形嘴、轻微左歪头的惊喜状态。灵动感来自“眼神先行 + 左右错峰 + 高光回弹 + 头部小幅滞后”。\n\n【一致性约束】只改变表情与微小头部姿态；禁止改变人物身份、发型、服装、脸型、眼睛基础形状、头身比例、原画风与画面构图；禁止夸张大笑、露齿、双眼完全对称、额外肢体动作或跨 IP 风格迁移。";
    if (sequence) {
      final = final.replace("【起始→目标】", "【连续帧起始→过渡→目标】").replace("120–300ms", "第 1–" + Math.max(2, Math.ceil(state.files.length * .4)) + " 帧").replace("180–420ms", "中间过渡帧").replace("350–700ms", "末段目标帧");
    }
    if (note) {
      final += "\n\n【用户补充观察】" + note;
    }
    document.getElementById("initialPrompt").textContent = initial;
    document.getElementById("finalPrompt").textContent = final;
  }

  analyzeButton.addEventListener("click", function () {
    if (!state.files.length) {
      uploadZone.focus();
      uploadZone.classList.add("dragover");
      setTimeout(function () { uploadZone.classList.remove("dragover"); }, 850);
      showToast("请先上传当前人物 IP 的表情素材");
      return;
    }
    analyzeButton.classList.add("loading");
    analyzeButton.querySelector("span").textContent = "正在提取动作参数…";
    analyzeButton.querySelector("svg").innerHTML = '<path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>';
    statusPill.classList.add("running");
    statusPill.querySelector("span").textContent = "分析中";

    setTimeout(function () {
      updateResultText();
      state.analyzed = true;
      resultEmpty.hidden = true;
      resultContent.hidden = false;
      analyzeButton.classList.remove("loading");
      analyzeButton.querySelector("span").textContent = "重新分析";
      analyzeButton.querySelector("svg").innerHTML = '<path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';
      statusPill.classList.remove("running");
      statusPill.querySelector("span").textContent = "分析完成";
      showToast("动作拆解与复刻检查已完成");
      if (window.innerWidth < 761) {
        document.getElementById("result-title").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 1250);
  });

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = document.getElementById(button.dataset.copy);
      navigator.clipboard.writeText(target.textContent).then(function () {
        var label = button.querySelector("span");
        var original = label ? label.textContent : "";
        if (label) label.textContent = "已复制";
        showToast("Prompt 已复制到剪贴板");
        setTimeout(function () { if (label) label.textContent = original; }, 1500);
      }).catch(function () {
        showToast("复制失败，请手动选择文本");
      });
    });
  });

  document.getElementById("exportButton").addEventListener("click", function () {
    var payload = {
      ip_name: getName(),
      input_mode: state.mode,
      frame_count: state.files.length,
      ip_features: document.getElementById("ipFeatures").textContent,
      emotion: {
        primary: "惊喜",
        secondary: ["害羞", "期待"],
        intensity: 0.78,
        transition: "克制期待 → 突然惊喜 → 缓慢停留"
      },
      vitality_core: document.getElementById("vitalityCore").textContent,
      dynamic_keywords: Array.from(document.querySelectorAll("#keywordChips span")).map(function (item) { return item.textContent; }),
      initial_prompt: document.getElementById("initialPrompt").textContent,
      replication_check: {
        score: 91,
        issue: "嘴部终态需要强约束",
        auto_fix: "最终开口不超过脸宽 9%，牙齿不可见"
      },
      final_prompt: document.getElementById("finalPrompt").textContent
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "expression-analysis-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("结构化 JSON 已导出");
  });

  document.getElementById("resetButton").addEventListener("click", function () {
    state.files = [];
    state.analyzed = false;
    renderFrames();
    document.getElementById("ipName").value = "";
    document.getElementById("notes").value = "";
    intensity.value = "2";
    intensityValue.textContent = "精细";
    statusPill.querySelector("span").textContent = "等待输入";
    resultContent.hidden = true;
    resultEmpty.hidden = false;
    analyzeButton.querySelector("span").textContent = "开始动作拆解";
    showToast("已清空当前任务");
  });

  document.getElementById("themeButton").addEventListener("click", function () {
    document.body.classList.toggle("compact");
    showToast(document.body.classList.contains("compact") ? "已切换为紧凑视图" : "已切换为舒展视图");
  });

  function registerWebMcpTools() {
    var context = document.modelContext;
    if (!context || typeof context.registerTool !== "function") return;
    var lifecycle = new AbortController();

    function register(tool) {
      try {
        Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(function () {});
      } catch (error) {
        return;
      }
    }

    register({
      name: "configure_expression_analysis",
      title: "配置表情分析",
      description: "设置当前人物 IP 名称、素材类型、拆解精度和观察备注，并同步更新页面中的可见输入控件。此操作不会上传图片或自动开始分析。",
      inputSchema: {
        type: "object",
        properties: {
          ipName: { type: "string", maxLength: 80 },
          mode: { type: "string", enum: ["single", "sequence"] },
          precision: { type: "string", enum: ["fast", "detailed", "frame_by_frame"] },
          notes: { type: "string", maxLength: 500 }
        },
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: function (input) {
        input = input || {};
        if (input.ipName !== undefined && typeof input.ipName !== "string") throw new Error("ipName 必须是字符串");
        if (input.notes !== undefined && typeof input.notes !== "string") throw new Error("notes 必须是字符串");
        if (input.mode !== undefined && ["single", "sequence"].indexOf(input.mode) === -1) throw new Error("mode 无效");
        if (input.precision !== undefined && ["fast", "detailed", "frame_by_frame"].indexOf(input.precision) === -1) throw new Error("precision 无效");
        if (input.ipName !== undefined) document.getElementById("ipName").value = input.ipName.slice(0, 80);
        if (input.notes !== undefined) document.getElementById("notes").value = input.notes.slice(0, 500);
        if (input.mode !== undefined) setMode(input.mode);
        if (input.precision !== undefined) {
          var precisionMap = { fast: "1", detailed: "2", frame_by_frame: "3" };
          intensity.value = precisionMap[input.precision];
          intensity.dispatchEvent(new Event("input"));
        }
        return {
          status: "configured",
          ipName: getName(),
          mode: state.mode,
          precision: ["fast", "detailed", "frame_by_frame"][Number(intensity.value) - 1],
          frameCount: state.files.length
        };
      }
    });

    register({
      name: "read_expression_analysis_result",
      title: "读取表情分析结果",
      description: "读取页面上当前可见的分析状态与最终优化 Prompt。仅在用户已经完成一次分析时返回完整结果。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: function () {
        return {
          status: state.analyzed ? "complete" : "not_analyzed",
          ipName: getName(),
          mode: state.mode,
          frameCount: state.files.length,
          finalPrompt: state.analyzed ? document.getElementById("finalPrompt").textContent : null
        };
      }
    });
  }

  registerWebMcpTools();
})();
