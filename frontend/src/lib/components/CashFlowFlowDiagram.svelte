<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { formatInr } from "$lib/format";
  import DashboardCard from "$lib/components/DashboardCard.svelte";
  import { getCashFlowSankeyData } from "$lib/cashflowSankey";

  let loading = true;
  let error = "";
  let data = null;

  const width = 980;
  const diagramHeight = 320;
  const leftX = 80;
  const rightX = width - 80;
  const nodeWidth = 16;
  const gap = 12;

  function currentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function nodeColor(type) {
    if (type === "income") return "#34d399";
    if (type === "other_income") return "#86efac";
    if (type === "expense") return "#fb7185";
    if (type === "other_expense") return "#fecdd3";
    if (type === "savings") return "#38bdf8";
    if (type === "deficit") return "#fb923c";
    return "#cbd5f5";
  }

  function prepareLayout(flowData) {
    const leftNodes = flowData.nodes.filter((n) => n.type === "income" || n.type === "other_income");
    const rightNodes = flowData.nodes.filter(
      (n) =>
        n.type === "expense" ||
        n.type === "other_expense" ||
        n.type === "savings" ||
        n.type === "deficit"
    );

    rightNodes.sort((a, b) => (b.value || 0) - (a.value || 0));
    const savingsIdx = rightNodes.findIndex((n) => n.type === "savings" || n.type === "deficit");
    if (savingsIdx >= 0) {
      const [savingsNode] = rightNodes.splice(savingsIdx, 1);
      rightNodes.push(savingsNode);
    }

    const totalIncome = leftNodes.reduce((sum, n) => sum + (n.value || 0), 0);
    const pxPerUnit = totalIncome > 0 ? diagramHeight / totalIncome : 0;

    const leftLayout = [];
    let cursor = 0;
    for (const node of leftNodes) {
      const height = Math.max(6, (node.value || 0) * pxPerUnit);
      leftLayout.push({ ...node, x: leftX, y: cursor, height });
      cursor += height + gap;
    }

    const rightLayout = [];
    cursor = 0;
    for (const node of rightNodes) {
      const height = Math.max(6, (node.value || 0) * pxPerUnit);
      rightLayout.push({ ...node, x: rightX, y: cursor, height });
      cursor += height + gap;
    }

    const leftByName = new Map(leftLayout.map((n) => [n.name, n]));
    const rightByName = new Map(rightLayout.map((n) => [n.name, n]));

    const links = flowData.links.map((link) => {
      const source = flowData.nodes[link.source];
      const target = flowData.nodes[link.target];
      const sourceNode = leftByName.get(source.name);
      const targetNode = rightByName.get(target.name);
      const thickness = Math.max(1, (link.value || 0) * pxPerUnit);
      const startY = (sourceNode?.y || 0) + (sourceNode?.height || 0) / 2;
      const endY = (targetNode?.y || 0) + (targetNode?.height || 0) / 2;
      const midX = leftX + nodeWidth + (rightX - (leftX + nodeWidth)) / 2;
      return {
        ...link,
        sourceNode,
        targetNode,
        thickness,
        startY,
        endY,
        midX
      };
    });

    return {
      leftLayout,
      rightLayout,
      links,
      pxPerUnit
    };
  }

  onMount(async () => {
    loading = true;
    try {
      const month = currentMonthKey();
      const payload = await apiGet(`/reports/cashflow-sankey?month=${month}`);
      const sankey = getCashFlowSankeyData(month, payload?.accounts || [], payload?.entries || []);
      data = sankey.nodes.length && sankey.links.length ? prepareLayout(sankey) : null;
    } catch (err) {
      error = err && err.message ? err.message : "Failed to load.";
    } finally {
      loading = false;
    }
  });
</script>

<DashboardCard
  title="Cash Flow Visualization"
  iconBg="bg-sky-50"
  iconColor="text-sky-600"
  variant="center"
  valueClass="text-sm font-semibold text-gray-600"
  bodyClass="text-xs text-gray-500"
  sparklineClass="h-72 w-full"
>
  <span slot="value">{loading ? "--" : "Income → Expense + Savings"}</span>
  <div slot="body">Current month cash movement across income sources and spending categories.</div>
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-6 w-6" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m-7.5-7.5v15" />
  </svg>
  <div slot="sparkline" class="h-full w-full">
    {#if error}
      <p class="text-xs text-rose-500">{error}</p>
    {:else if loading}
      <p class="text-xs text-gray-400">Loading diagram...</p>
    {:else if !data}
      <p class="text-xs text-gray-400">Not enough data for this month.</p>
    {:else}
      <svg viewBox={`0 0 ${width} ${diagramHeight}`} class="h-full w-full">
        {#each data.links as link}
          <path
            d={`M ${leftX + nodeWidth},${link.startY}
              C ${link.midX},${link.startY}
                ${link.midX},${link.endY}
                ${rightX},${link.endY}`}
            fill="none"
            stroke="#60a5fa"
            stroke-opacity="0.3"
            stroke-linecap="round"
            stroke-width={link.thickness}
          >
            <title>
              {`${link.sourceNode?.name || ""} → ${link.targetNode?.name || ""}: ₹${formatInr(link.value)}`}
            </title>
          </path>
        {/each}
        {#each data.leftLayout as node}
          <rect
            x={node.x}
            y={node.y}
            width={nodeWidth}
            height={node.height}
            fill={nodeColor(node.type)}
            fill-opacity="0.85"
          />
          <text
            x={node.x + nodeWidth + 8}
            y={node.y + node.height / 2}
            text-anchor="start"
            dominant-baseline="middle"
            class="fill-gray-600 text-[11px] font-medium"
          >
            {node.name} · ₹{formatInr(node.value)}
          </text>
        {/each}
        {#each data.rightLayout as node}
          <rect
            x={node.x}
            y={node.y}
            width={nodeWidth}
            height={node.height}
            fill={nodeColor(node.type)}
            fill-opacity="0.85"
          />
          <text
            x={node.x - 8}
            y={node.y + node.height / 2}
            text-anchor="end"
            dominant-baseline="middle"
            class="fill-gray-600 text-[11px] font-medium"
          >
            {node.name} · ₹{formatInr(node.value)}
          </text>
        {/each}
      </svg>
    {/if}
  </div>
</DashboardCard>
