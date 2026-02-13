/**
 * Prometheus UI – D3.js Interactive Visualizations (VIS-001)
 * Adapter for D3.js v7 with Sankey, Force Graph, and Treemap.
 * CDN-based lazy loading.
 */

let d3Loaded = false;
let d3 = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  D3.js Loader
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadD3() {
    if (d3Loaded || typeof window.d3 !== 'undefined') {
        d3 = window.d3;
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
        script.onload = () => {
            d3Loaded = true;
            d3 = window.d3;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadD3Sankey() {
    if (typeof window.d3?.sankey !== 'undefined') return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/dist/d3-sankey.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ━━━━━━━━━━━━━━━ Prometheus Dark Theme ━━━━━━━━━━━━━━━━━

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];
const BG_COLOR = '#0f0f1a';
const TEXT_COLOR = '#a0aec0';
const GRID_COLOR = '#1a1a2e';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Sankey Diagram – Money Flow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render a Sankey diagram showing money/resource flow.
 * @param {HTMLElement} container
 * @param {object} data - { nodes: [{name}], links: [{source, target, value}] }
 * @param {object} [options]
 */
export async function renderSankeyDiagram(container, data, options = {}) {
    await loadD3();
    await loadD3Sankey();

    const { width = 700, height = 400 } = options;
    container.innerHTML = '';

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', BG_COLOR)
        .style('border-radius', '8px');

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(12)
        .extent([[30, 20], [width - 30, height - 20]]);

    const graph = sankey({
        nodes: data.nodes.map(d => Object.assign({}, d)),
        links: data.links.map(d => Object.assign({}, d)),
    });

    // Links
    svg.append('g')
        .selectAll('path')
        .data(graph.links)
        .join('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr('stroke', (_, i) => COLORS[i % COLORS.length])
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', d => Math.max(1, d.width))
        .append('title')
        .text(d => `${d.source.name} → ${d.target.name}\n$${d.value.toLocaleString()}`);

    // Nodes
    const node = svg.append('g')
        .selectAll('g')
        .data(graph.nodes)
        .join('g');

    node.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', (_, i) => COLORS[i % COLORS.length])
        .attr('rx', 3)
        .attr('opacity', 0.9);

    node.append('text')
        .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', d => (d.y0 + d.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', '11px')
        .attr('font-family', 'Inter, sans-serif')
        .text(d => d.name);

    return svg.node();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Force Graph – Network Relationships
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render an interactive force-directed graph.
 * @param {HTMLElement} container
 * @param {object} data - { nodes: [{id, label, group}], links: [{source, target, value}] }
 * @param {object} [options]
 */
export async function renderForceGraph(container, data, options = {}) {
    await loadD3();

    const { width = 600, height = 400 } = options;
    container.innerHTML = '';

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', BG_COLOR)
        .style('border-radius', '8px');

    // Add zoom
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 5]).on('zoom', (event) => {
        g.attr('transform', event.transform);
    }));

    const color = d3.scaleOrdinal(COLORS);

    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(25));

    // Links
    const link = g.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', GRID_COLOR)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value || 1));

    // Nodes
    const node = g.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('r', d => d.size || 10)
        .attr('fill', d => color(d.group || 0))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .call(d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            })
        );

    // Labels
    const label = g.append('g')
        .selectAll('text')
        .data(data.nodes)
        .join('text')
        .text(d => d.label || d.id)
        .attr('fill', TEXT_COLOR)
        .attr('font-size', '10px')
        .attr('font-family', 'Inter, sans-serif')
        .attr('dx', 14)
        .attr('dy', 4);

    // Tooltip on hover
    node.append('title').text(d => d.label || d.id);

    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        label.attr('x', d => d.x).attr('y', d => d.y);
    });

    return svg.node();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Treemap – Market Distribution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Render a treemap for market segment distribution.
 * @param {HTMLElement} container
 * @param {object} data - { name: 'root', children: [{ name, value, group }] }
 * @param {object} [options]
 */
export async function renderTreemap(container, data, options = {}) {
    await loadD3();

    const { width = 600, height = 400 } = options;
    container.innerHTML = '';

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', BG_COLOR)
        .style('border-radius', '8px');

    const root = d3.hierarchy(data).sum(d => d.value).sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .paddingInner(2)
        .paddingOuter(4)
        .round(true)(root);

    const color = d3.scaleOrdinal(COLORS);

    const cell = svg.selectAll('g')
        .data(root.leaves())
        .join('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

    cell.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => color(d.data.group || d.data.name))
        .attr('rx', 3)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function () { d3.select(this).attr('opacity', 1); })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.85); });

    cell.append('text')
        .attr('x', 6)
        .attr('y', 16)
        .attr('fill', '#fff')
        .attr('font-size', d => (d.x1 - d.x0) > 60 ? '11px' : '8px')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-weight', 500)
        .text(d => {
            const w = d.x1 - d.x0;
            return w > 40 ? d.data.name : '';
        });

    cell.append('text')
        .attr('x', 6)
        .attr('y', 30)
        .attr('fill', '#ffffffaa')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(d => {
            const w = d.x1 - d.x0;
            return w > 60 ? `$${d.data.value?.toLocaleString() || ''}` : '';
        });

    cell.append('title')
        .text(d => `${d.data.name}: $${d.data.value?.toLocaleString()}`);

    return svg.node();
}

/**
 * Check if D3 is loaded.
 */
export function isD3Ready() {
    return typeof window.d3 !== 'undefined';
}
