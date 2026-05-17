// ============================================================
// TASK 1 - COFFEE & CODE VISUALIZATION
// D3.js v7 | Raw CSV aggregation + rendering
// ============================================================


// ============================================================
// SVG CANVAS SETUP
// ============================================================

const width  = 1600;
const height = 990;

const svg = d3.select("#visualization")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "#f4f1eb");


// ============================================================
// COLOR PALETTES
// ============================================================

const dailyCupColors = {
    "1-2 cups" : "#c7d4e2",
    "3-4 cups" : "#3483b8",
    "5+ cups"  : "#173f6d"
};

const beliefColors = {
    "Coffee solves bugs"          : "#34c96b",
    "Sometimes solves bugs"       : "#f5a10b",
    "Coffee does not solve bugs"  : "#ea4b3c"
};

const dependencyColors = {
    "Can code without coffee"          : "#27ae60",
    "Sometimes need coffee to code"    : "#e67e22",
    "Cannot code without coffee"       : "#c0392b"
};


// ============================================================
// RAW CSV INGESTION AND AGGREGATION
// ============================================================

d3.csv("./data/CoffeeAndCode.csv").then(rawData => {

    // --------------------------------------------------------
    // STEP 1: Normalise raw columns into dependency buckets
    // CodingWithoutCoffee: "Yes" / "No" / "Sometimes"
    // CoffeeCupsPerDay:    numeric string
    // CoffeeSolveBugs:     "Yes" / "No" / "Sometimes"
    // --------------------------------------------------------

    /**
     * Map the raw CodingWithoutCoffee value to one of the three
     * dependency labels used throughout the visualisation.
     *
     * @param {string} raw - Raw cell value from the CSV.
     * @returns {string} Canonical dependency label.
     */
    function mapDependency(raw) {
        const v = raw.trim();
        if (v === "Yes")       return "Can code without coffee";
        if (v === "No")        return "Cannot code without coffee";
        return                        "Sometimes need coffee to code";
    }

    /**
     * Map a numeric cups-per-day value to a display bucket.
     *
     * @param {number} n - Daily cup count.
     * @returns {string} Bucket label matching dailyCupColors keys.
     */
    function mapCupBucket(n) {
        if (n <= 2) return "1-2 cups";
        if (n <= 4) return "3-4 cups";
        return              "5+ cups";
    }

    /**
     * Map the raw CoffeeSolveBugs value to a belief label.
     *
     * @param {string} raw - Raw cell value from the CSV.
     * @returns {string} Canonical belief label.
     */
    function mapBelief(raw) {
        const v = raw.trim();
        if (v === "Yes") return "Coffee solves bugs";
        if (v === "No")  return "Coffee does not solve bugs";
        return                  "Sometimes solves bugs";
    }

    // --------------------------------------------------------
    // STEP 2: Parse and tag every row
    // --------------------------------------------------------

    const rows = rawData.map(d => ({
        dependency : mapDependency(d.CodingWithoutCoffee),
        cups       : +d.CoffeeCupsPerDay,
        cupBucket  : mapCupBucket(+d.CoffeeCupsPerDay),
        belief     : mapBelief(d.CoffeeSolveBugs)
    }));

    // --------------------------------------------------------
    // STEP 3: Compute percentages per dependency group
    //
    // Returns an array of objects shaped like:
    //   { dependency, metric, category, percentage }
    // which matches the schema the drawing functions expect.
    // --------------------------------------------------------

    const dependencies = [
        "Can code without coffee",
        "Sometimes need coffee to code",
        "Cannot code without coffee"
    ];

    const aggregated = [];

    dependencies.forEach(dep => {

        const group = rows.filter(r => r.dependency === dep);
        const n     = group.length;

        if (n === 0) return;

        // -- Daily cups breakdown --------------------------------
        ["1-2 cups", "3-4 cups", "5+ cups"].forEach(bucket => {
            const count = group.filter(r => r.cupBucket === bucket).length;
            aggregated.push({
                dependency : dep,
                metric     : "daily_cups",
                category   : bucket,
                percentage : Math.round((count / n) * 100)
            });
        });

        // -- Bug-fix belief breakdown ----------------------------
        [
            "Coffee solves bugs",
            "Sometimes solves bugs",
            "Coffee does not solve bugs"
        ].forEach(belief => {
            const count = group.filter(r => r.belief === belief).length;
            aggregated.push({
                dependency : dep,
                metric     : "bug_belief",
                category   : belief,
                percentage : Math.round((count / n) * 100)
            });
        });
    });

    // --------------------------------------------------------
    // STEP 4: Compute average cups per dependency group for
    //         the average panel (used in drawAveragePanel).
    // --------------------------------------------------------
    const avgByDep = {};
    dependencies.forEach(dep => {
        const group = rows.filter(r => r.dependency === dep);
        const total = group.reduce((s, r) => s + r.cups, 0);
        avgByDep[dep] = group.length
            ? +(total / group.length).toFixed(2)
            : 0;
    });

    // --------------------------------------------------------
    // STEP 5: Render all panels
    // Change x/y in layout to reposition any panel without
    // touching the draw functions themselves.
    // --------------------------------------------------------

    const totalN = rows.length;

    const layout = {
        main:        { x: 360,  y: 160 },
        bubble:      { x: 1220, y: 60  },
        average:     { x: 1220, y: 460 },
        legends:     { x: 0,    y: 910 },
        footer:      { x: 0,    y: 955 },
        annotations: { x: 0,    y: 0   }
    };

    const grpMain        = svg.append("g").attr("id", "grp-main")       .attr("transform", `translate(${layout.main.x},        ${layout.main.y})`);
    const grpBubble      = svg.append("g").attr("id", "grp-bubble")     .attr("transform", `translate(${layout.bubble.x},      ${layout.bubble.y})`);
    const grpAverage     = svg.append("g").attr("id", "grp-average")    .attr("transform", `translate(${layout.average.x},     ${layout.average.y})`);
    const grpLegends     = svg.append("g").attr("id", "grp-legends")    .attr("transform", `translate(${layout.legends.x},     ${layout.legends.y})`);
    const grpFooter      = svg.append("g").attr("id", "grp-footer")     .attr("transform", `translate(${layout.footer.x},      ${layout.footer.y})`);
    const grpAnnotations = svg.append("g").attr("id", "grp-annotations").attr("transform", `translate(${layout.annotations.x}, ${layout.annotations.y})`);

    drawMainPanel(aggregated, grpMain);
    drawRadialBarPanel(rows, grpBubble);
    drawAveragePanel(avgByDep, grpAverage);
    drawLegends(grpLegends);
    drawFooter(totalN, grpFooter);
    drawAnnotations(aggregated, grpAnnotations, layout.main.x, layout.main.y);

});


// ============================================================
// MAIN LEFT PANEL — stacked bars per dependency group
// ============================================================

function drawMainPanel(data, container) {

    const panel = container;

    const xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 800]);

    const dependencies = [
        "Can code without coffee",
        "Sometimes need coffee to code",
        "Cannot code without coffee"
    ];

    const groupSpacing = 240;
    const barHeight    = 70;
    const totalBarsH   = (dependencies.length - 1) * groupSpacing + 100 + barHeight; // y extent of all bars

    // ---- Percentage reference lines (quantitative axis guides) -----
    // Description sits above the bars; numeric ticks sit below.
    panel.append("text")
        .attr("x",           400)
        .attr("y",           -16)
        .attr("text-anchor", "middle")
        .attr("font-size",   16)
        .attr("fill",        "#aaa")
        .attr("font-style",  "italic")
        .text("Share of respondents within each dependency group (row %)");

    panel.append("text")
        .attr("x",           -10)
        .attr("y",           totalBarsH + 16)
        .attr("text-anchor", "end")
        .attr("font-size",   14)
        .attr("fill",        "#aaa")
        .text("0%");

    [25, 50, 75, 100].forEach(pct => {
        const tx = xScale(pct);
        panel.append("line")
            .attr("x1", tx).attr("y1", -5)
            .attr("x2", tx).attr("y2", totalBarsH)
            .attr("stroke",           "#d0cbc4")
            .attr("stroke-width",     1)
            .attr("stroke-dasharray", "4,4");
        panel.append("text")
            .attr("x",           tx)
            .attr("y",           totalBarsH + 16)
            .attr("text-anchor", "middle")
            .attr("font-size",   14)
            .attr("fill",        "#aaa")
            .text(pct + "%");
    });

    dependencies.forEach((dependency, i) => {

        const baseY = i * groupSpacing;

        // ---- Group separator line (skip first — summary box is its top boundary) ---
        if (i > 0) {
            panel.append("line")
                .attr("x1", 0)
                .attr("x2", 800)
                .attr("y1", baseY - 20)
                .attr("y2", baseY - 20)
                .attr("stroke", "#d8d2ca")
                .attr("stroke-width", 2);
        }

        // ---- Dependency group label (left-aligned above the bars) --
        panel.append("text")
            .attr("x", -170)
            .attr("y", baseY - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", 20)
            .attr("font-weight", "bold")
            .attr("fill", dependencyColors[dependency])
            .text(dependency);

        // ---- Row sub-labels -------------------------------------
        panel.append("text")
            .attr("x", -25)
            .attr("y", baseY + 48)
            .attr("text-anchor", "end")
            .attr("font-size", 16)
            .attr("font-style", "italic")
            .attr("fill", "#666")
            .text("Daily cups");

        panel.append("text")
            .attr("x", -25)
            .attr("y", baseY + 148)
            .attr("text-anchor", "end")
            .attr("font-size", 16)
            .attr("font-style", "italic")
            .attr("fill", "#666")
            .text("Bug-fix belief");

        // ---- Daily cups stacked bar -----------------------------
        const dailyData = data.filter(d =>
            d.dependency === dependency &&
            d.metric     === "daily_cups"
        );

        drawStackedBar(
            panel, dailyData, xScale,
            0, baseY, dailyCupColors, barHeight
        );

        // ---- Bug-fix belief stacked bar -------------------------
        const beliefData = data.filter(d =>
            d.dependency === dependency &&
            d.metric     === "bug_belief"
        );

        drawStackedBar(
            panel, beliefData, xScale,
            0, baseY + 100, beliefColors, barHeight
        );
    });

}


// ============================================================
// STACKED BAR RENDERER
// Draws one horizontal stacked bar with inline percentage labels.
// ============================================================

function drawStackedBar(parent, data, scale, x, y, colors, barH) {

    let cumulative = 0;

    data.forEach(d => {

        const segW = scale(d.percentage);

        // Rectangle segment
        parent.append("rect")
            .attr("x",      x + scale(cumulative))
            .attr("y",      y)
            .attr("width",  segW)
            .attr("height", barH)
            .attr("fill",   colors[d.category]);

        // Inline label — only when segment is wide enough
        if (d.percentage >= 8) {
            parent.append("text")
                .attr("x",                  x + scale(cumulative) + segW / 2)
                .attr("y",                  y + barH / 2)
                .attr("text-anchor",        "middle")
                .attr("dominant-baseline",  "middle")
                .attr("fill",               "white")
                .attr("font-size",          18)
                .attr("font-weight",        "bold")
                .text(`${d.percentage}%`);
        }

        cumulative += d.percentage;
    });
}


// ============================================================
// RADIAL BAR PANEL — coffee timing distribution (right panel top)
// Each concentric ring represents a timing category;
// the arc angle encodes the % of respondents.
// ============================================================

function drawRadialBarPanel(rows, container) {

    const panel = container;

    // ---- Layout config — adjust these to resize / reposition ----
    const cx     = 170;  // centre x within panel
    const cy     = 170;  // centre y within panel (moved up to give legend room)
    const innerR = 30;   // inner radius of the innermost ring
    const ringW  = 20;   // radial width of each ring
    const ringGap = 6;   // gap between consecutive rings
    // -------------------------------------------------------------

    // Static timing data — proportions match the original bubble chart
    const timingData = [
        { label: "Before coding",         pct: 29, color: "#3483b8" },
        { label: "While coding",          pct: 38, color: "#173f6d" },
        { label: "Before & while coding", pct: 19, color: "#c7d4e2" },
        { label: "All the time",          pct: 12, color: "#888888" }
    ];

    const outerR  = innerR + timingData.length * (ringW + ringGap) - ringGap;
    const startA  = -Math.PI / 2;   // 12 o'clock

    // ---- Panel title -------------------------------------------
    panel.append("text")
        .attr("x", cx).attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size",   19)
        .attr("font-weight", "bold")
        .text("When do programmers drink coffee?");

    panel.append("text")
        .attr("x", cx).attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("font-size",   14)
        .attr("fill",        "#666")
        .text("% of respondents by timing");

    // ---- Background rings (full circles, muted) -----------------
    timingData.forEach((d, i) => {
        const r0 = innerR + i * (ringW + ringGap);
        const r1 = r0 + ringW;
        const bgArc = d3.arc()
            .innerRadius(r0).outerRadius(r1)
            .startAngle(0).endAngle(2 * Math.PI);
        panel.append("path")
            .attr("d", bgArc())
            .attr("transform", `translate(${cx},${cy})`)
            .attr("fill",    "#e0dbd3")
            .attr("opacity", 0.55);
    });

    // ---- Data arcs (one per timing category) -------------------
    timingData.forEach((d, i) => {
        const r0   = innerR + i * (ringW + ringGap);
        const r1   = r0 + ringW;

        // d3.arc convention: 0 = 12 o'clock, positive = clockwise.
        // Do NOT use startA here — that is SVG trig (-π/2 = top),
        // which d3.arc would interpret as 9 o'clock (left).
        const arc = d3.arc()
            .innerRadius(r0).outerRadius(r1)
            .startAngle(0)
            .endAngle((d.pct / 100) * 2 * Math.PI);

        panel.append("path")
            .attr("d", arc())
            .attr("transform", `translate(${cx},${cy})`)
            .attr("fill",    d.color)
            .attr("opacity", 0.9);
    });

    // ---- Grid lines + labels drawn AFTER arcs so they show through --

    // Circular boundaries at each ring edge
    for (let i = 0; i <= timingData.length; i++) {
        const r = innerR + i * (ringW + ringGap) - (i > 0 ? ringGap : 0);
        panel.append("circle")
            .attr("cx", cx).attr("cy", cy).attr("r", r)
            .attr("fill",         "none")
            .attr("stroke",       "#999590")
            .attr("stroke-width", i === timingData.length ? 1.2 : 0.8);
    }

    // Spokes at every 10 % with labels outside the outer contour.
    // 0 % (start line) is solid; all others are dashed.
    // Quarters (0 / 25 / 50 / 75 %) run from centre; rest from innerR.
    const quarterSet = new Set([0, 25, 50, 75]);
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(pct => {
        const angle    = startA + (pct / 100) * 2 * Math.PI;
        const isQuart  = quarterSet.has(pct);
        const labelR   = outerR + 22;

        // Spoke line
        panel.append("line")
            .attr("x1", cx + Math.cos(angle) * (isQuart ? 0 : innerR))
            .attr("y1", cy + Math.sin(angle) * (isQuart ? 0 : innerR))
            .attr("x2", cx + Math.cos(angle) * (outerR + 6))
            .attr("y2", cy + Math.sin(angle) * (outerR + 6))
            .attr("stroke",           isQuart ? "#888" : "#bbb8b2")
            .attr("stroke-width",     isQuart ? 1.2   : 0.8)
            .attr("stroke-dasharray", pct === 0 ? "none" : (isQuart ? "5,3" : "2,3"));

        // Label outside the outer ring
        panel.append("text")
            .attr("x",                cx + Math.cos(angle) * labelR)
            .attr("y",                cy + Math.sin(angle) * labelR)
            .attr("text-anchor",      "middle")
            .attr("dominant-baseline","middle")
            .attr("font-size",        isQuart ? 15 : 14)
            .attr("font-weight",      isQuart ? "bold" : "normal")
            .attr("fill",             isQuart ? "#555" : "#999")
            .text(pct + "%");
    });

    // ---- Centre label ------------------------------------------
    panel.append("text")
        .attr("x", cx).attr("y", cy - 5)
        .attr("text-anchor",      "middle")
        .attr("dominant-baseline","middle")
        .attr("font-size",        14)
        .attr("fill",             "#999")
        .text("Coffee");

    panel.append("text")
        .attr("x", cx).attr("y", cy + 9)
        .attr("text-anchor",      "middle")
        .attr("dominant-baseline","middle")
        .attr("font-size",        14)
        .attr("fill",             "#999")
        .text("Timing");

    // ---- Legend — single column, sorted highest % to lowest --------
    // Single column avoids overflow: panel is only 380 px wide and the
    // longest label ("Before & while coding — 19%") exceeds a right column.
    const legY      = cy + outerR + 50;
    const legSorted = [...timingData].sort((a, b) => b.pct - a.pct);

    legSorted.forEach((d, i) => {
        const ly = legY + i * 18;

        panel.append("rect")
            .attr("x",      10).attr("y", ly - 11)
            .attr("width",  16).attr("height", 16)
            .attr("fill",   d.color);

        panel.append("text")
            .attr("x",         32)
            .attr("y",         ly)
            .attr("font-size", 14)
            .attr("fill",      "#333")
            .text(`${d.label} — ${d.pct}%`);
    });
}


// ============================================================
// AVERAGE PANEL — horizontal bars for mean daily cups
// ============================================================

function drawAveragePanel(avgByDep, container) {

    const panel = container;

    // Panel title
    panel.append("text")
        .attr("x", 170).attr("y", 50)
        .attr("text-anchor", "middle")
        .attr("font-size",   20)
        .attr("font-weight", "bold")
        .text("Average daily coffee consumption");

    // ---- Layout config — change these to resize/reposition -----
    const cupWidth   = 36;   // width of each cup icon in px
    const cupHeight  = 48;   // height of each cup icon in px
    const cupGap     = 8;    // horizontal gap between cup icons
    const rowSpacing = 110;  // vertical distance between successive rows
    // -------------------------------------------------------------

    const dependencies = [
        "Can code without coffee",
        "Sometimes need coffee to code",
        "Cannot code without coffee"
    ];

    const barColors = [
        dependencyColors["Can code without coffee"],
        dependencyColors["Sometimes need coffee to code"],
        dependencyColors["Cannot code without coffee"]
    ];

    dependencies.forEach((dep, i) => {
        const avg   = avgByDep[dep] || 0;
        const y     = i * rowSpacing+70;
        const nFull = Math.floor(avg);
        const frac  = +(avg - nFull).toFixed(2);

        // Full cups
        for (let j = 0; j < nFull; j++) {
            drawCoffeeIcon(panel, j * (cupWidth + cupGap), y, cupWidth, cupHeight, barColors[i], 1);
        }

        // Partial cup (fractional remainder)
        if (frac >= 0.1) {
            drawCoffeeIcon(panel, nFull * (cupWidth + cupGap), y, cupWidth, cupHeight, barColors[i], frac);
        }

        // Value label to the right of the icons
        const iconCount = nFull + (frac >= 0.1 ? 1 : 0);
        panel.append("text")
            .attr("x",           iconCount * (cupWidth + cupGap) + 6)
            .attr("y",           y + cupHeight * 0.6)
            .attr("font-size",   17)
            .attr("font-weight", "bold")
            .attr("fill",        barColors[i])
            .text(`${avg} cups avg`);

        // Dependency sub-label beneath the icons
        panel.append("text")
            .attr("x",         0)
            .attr("y",         y + cupHeight + 18)
            .attr("font-size", 16)
            .attr("fill",      "#666")
            .text(dep);
    });
}


// ============================================================
// COFFEE CUP ICON
// Draws a cup SVG path scaled to (w × h) px.
// fillFraction 0–1 fills the cup from the bottom up.
// Pass a unique clipId string for partial fills.
// ============================================================

function drawCoffeeIcon(parent, x, y, w, h, color, fillFraction) {

    const sx = w / 40;   // scale relative to 40-unit design width
    const sy = h / 48;   // scale relative to 48-unit design height

    // Cup body — trapezoid, wider at the top
    const body   = `M ${3*sx},${4*sy} L ${37*sx},${4*sy} L ${32*sx},${44*sy} L ${8*sx},${44*sy} Z`;

    // Handle — C-curve on the right side
    const handle = `M ${37*sx},${12*sy} C ${50*sx},${12*sy} ${50*sx},${32*sy} ${37*sx},${32*sy} L ${35*sx},${28*sy} C ${46*sx},${28*sy} ${46*sx},${16*sy} ${35*sx},${16*sy} Z`;

    // Rim — elliptical highlight at the top opening
    const rim    = `M ${3*sx},${4*sy} Q ${20*sx},0 ${37*sx},${4*sy} Q ${20*sx},${8*sy} ${3*sx},${4*sy} Z`;

    // Full cups render at 0.9 opacity; partial cups use fillFraction directly
    // so a 0.94 decimal → 0.94 opacity, 0.07 decimal → 0.07 opacity, etc.
    const opacity = fillFraction >= 1 ? 0.9 : fillFraction;

    const g = parent.append("g").attr("transform", `translate(${x},${y})`);
    g.append("path").attr("d", body).attr("fill",   color).attr("opacity", opacity);
    g.append("path").attr("d", handle).attr("fill", color).attr("opacity", opacity);
    g.append("path").attr("d", rim).attr("fill", "rgba(255,255,255,0.25)").attr("opacity", opacity);
}


// ============================================================
// LEGENDS
// ============================================================

function drawLegends(container) {

    // ---- Daily cups legend ----------------------------------
    const legend = container.append("g")
        .attr("transform", "translate(160, 0)");

    legend.append("text")
        .attr("x",           90)
        .attr("y",           -20)
        .attr("font-size",   18)
        .attr("font-weight", "bold")
        .text("Daily Coffee Cups");

    ["1-2 cups", "3-4 cups", "5+ cups"].forEach((d, i) => {

        legend.append("rect")
            .attr("x",      i * 120).attr("y", 0)
            .attr("width",  20).attr("height", 20)
            .attr("fill",   dailyCupColors[d]);

        legend.append("text")
            .attr("x",         i * 120 + 30)
            .attr("y",         15)
            .attr("font-size", 16)
            .text(d);
    });

    // ---- Bug-fix belief legend ------------------------------
    const beliefLegend = container.append("g")
        .attr("transform", "translate(560, 0)");

    beliefLegend.append("text")
        .attr("x",           120)
        .attr("y",           -20)
        .attr("font-size",   18)
        .attr("font-weight", "bold")
        .text("Does Coffee Solve Bugs?");

    [
        "Coffee solves bugs",
        "Sometimes solves bugs",
        "Coffee does not solve bugs"
    ].forEach((d, i) => {

        beliefLegend.append("rect")
            .attr("x",      i * 210).attr("y", 0)
            .attr("width",  20).attr("height", 20)
            .attr("fill",   beliefColors[d]);

        beliefLegend.append("text")
            .attr("x",         i * 210 + 30)
            .attr("y",         15)
            .attr("font-size", 16)
            .text(d);
    });
}


// ============================================================
// ANNOTATIONS
// Derives the annotation text from actual computed percentages
// rather than hardcoding values.
// ============================================================

function drawAnnotations(data, container, mainPanelX, mainPanelY) {

    const find = (dep, metric, cat) => data.find(d =>
        d.dependency === dep && d.metric === metric && d.category === cat
    );

    const r1 = find("Can code without coffee",    "daily_cups", "1-2 cups");
    const r2 = find("Can code without coffee",    "bug_belief", "Coffee does not solve bugs");
    const r3 = find("Cannot code without coffee", "daily_cups", "3-4 cups");
    const r4 = find("Cannot code without coffee", "bug_belief", "Coffee solves bugs");

    const p1 = r1 ? `${r1.percentage}%` : "–";
    const p2 = r2 ? `${r2.percentage}%` : "–";
    const p3 = r3 ? `${r3.percentage}%` : "–";
    const p4 = r4 ? `${r4.percentage}%` : "–";

    const cIndependent = dependencyColors["Can code without coffee"];
    const cDep   = dependencyColors["Cannot code without coffee"];

    // ---- Summary header above the stacked bars ------------------
    const g = container.append("g").attr("transform", "translate(360, 42)");

    g.append("rect")
        .attr("width",        800)
        .attr("height",       80)
        .attr("fill",         "white")
        .attr("stroke",       "#d8d2ca")
        .attr("stroke-width", 1.5)
        .attr("rx",           6);

    // Section label + sample note
    g.append("text")
        .attr("x",            14)
        .attr("y",            17)
        .attr("font-size",    16)
        .attr("font-weight",  "bold")
        .attr("fill",         "#999")
        .text("KEY INSIGHTS");

    g.append("text")
        .attr("x",           786)
        .attr("y",           17)
        .attr("text-anchor", "end")
        .attr("font-size",   14)
        .attr("fill",        "#aaa")
        .text("*within-group row % · CoffeeAndCode.csv");

    // Column headings
    g.append("text")
        .attr("x",            14)
        .attr("y",            33)
        .attr("font-size",    15)
        .attr("font-weight",  "bold")
        .attr("fill",         cIndependent)
        .text("Independent Coders");

    g.append("text")
        .attr("x",            415)
        .attr("y",            33)
        .attr("font-size",    15)
        .attr("font-weight",  "bold")
        .attr("fill",         cDep)
        .text("Coffee-Dependent Coders");

    // Vertical divider between columns
    g.append("line")
        .attr("x1", 400).attr("y1", 5)
        .attr("x2", 400).attr("y2", 75)
        .attr("stroke",       "#e0dbd3")
        .attr("stroke-width", 1);

    // Helper: one insight row (bold coloured % + grey description)
    function insight(x, y, pct, color, desc) {
        const t = g.append("text").attr("x", x).attr("y", y).attr("font-size", 15);
        t.append("tspan").attr("font-weight", "bold").attr("fill", color).text(pct + "  ");
        t.append("tspan").attr("fill", "#444").text(desc);
    }

    insight(14,  54, p1, cIndependent, "drink only 1–2 cups/day");
    insight(14,  72, p2, cIndependent, "say coffee does NOT solve bugs");
    insight(415, 54, p3, cDep,   "drink 3–4 cups/day");
    insight(415, 72, p4, cDep,   "believe coffee fixes bugs");

    // ---- Arrow annotation for the tiny unlabelled segment -------
    // xScale must match drawMainPanel's scale definition
    const xS = d3.scaleLinear().domain([0, 100]).range([0, 850]);

    const cupsBuckets = ["1-2 cups", "3-4 cups", "5+ cups"];
    const cupsSegments    = cupsBuckets
        .map(cat => find("Can code without coffee", "daily_cups", cat))
        .filter(Boolean);

    // Smallest segment is the one without an inline label (< 8%)
    const smallSegment = cupsSegments.reduce(
        (min, d) => d.percentage < min.percentage ? d : min,
        cupsSegments[0]
    );

    if (smallSegment && smallSegment.percentage < 8) {

        // Compute where the small segment starts on the x axis
        let cumPct = 0;
        for (const seg of cupsSegments) {
            if (seg.category === smallSegment.category) break;
            cumPct += seg.percentage;
        }

        const segMidX  = mainPanelX + xS(cumPct + smallSegment.percentage / 2);
        const barTopY  = mainPanelY; // baseY = 0 for "Can code without coffee"

        // Leader line from label down to the bar top
        container.append("line")
            .attr("x1", segMidX - 50).attr("y1", barTopY - 17)
            .attr("x2", segMidX - 50).attr("y2", barTopY - 2)
            .attr("stroke",       "#555")
            .attr("stroke-width", 1.5);

        // Arrowhead triangle pointing into the bar
        container.append("polygon")
            .attr("points", `${segMidX - 50},${barTopY} ${segMidX - 55},${barTopY - 9} ${segMidX - 45},${barTopY - 9}`)
            .attr("fill", "#555");

        // Percentage label above the leader line
        container.append("text")
            .attr("x",           segMidX - 50)
            .attr("y",           barTopY - 21)
            .attr("text-anchor", "middle")
            .attr("font-size",   14)
            .attr("font-weight", "bold")
            .attr("fill",        "#555")
            .text(`${smallSegment.percentage}%`);
    }
}


// ============================================================
// FOOTER — methodology note, sample size, dataset reference
// Addresses source transparency and academic rigour requirements.
// ============================================================

function drawFooter(totalN, container) {

    // Separator rule
    container.append("line")
        .attr("x1", 20).attr("y1", 0)
        .attr("x2", 1580).attr("y2", 0)
        .attr("stroke",       "#d8d2ca")
        .attr("stroke-width", 1);

    // Left block — dataset provenance
    const left = container.append("text")
        .attr("x",         20)
        .attr("y",         18)
        .attr("font-size", 14)
        .attr("fill",      "#888");

    left.append("tspan")
        .attr("font-weight", "bold")
        .text("Dataset: ");
    left.append("tspan")
        .text("CoffeeAndCode.csv (public survey dataset)");

    left.append("tspan")
        .attr("dx", 20)
        .attr("font-weight", "bold")
        .text("n = ");
    left.append("tspan")
        .text(`${totalN} respondents`);

    // Centre block — percentage methodology
    container.append("text")
        .attr("x",           800)
        .attr("y",           18)
        .attr("text-anchor", "middle")
        .attr("font-size",   14)
        .attr("fill",        "#888")
        .text("All percentages are within-group row shares (% of each dependency subgroup, not of total dataset)");

    // Right block — category definitions
    const right = container.append("text")
        .attr("x",           1580)
        .attr("y",           18)
        .attr("text-anchor", "end")
        .attr("font-size",   14)
        .attr("fill",        "#888");

    right.append("tspan")
        .attr("font-weight", "bold")
        .text("Cups/day: ");
    right.append("tspan")
        .text("1–2 · 3–4 · 5+   ");
    right.append("tspan")
        .attr("font-weight", "bold")
        .text("Bug belief: ");
    right.append("tspan")
        .text("Yes · Sometimes · No");
}