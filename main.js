/* ########################### Constants ########################## */
const PATH_TO_DATA = "/data/propublica-two-years.json";
// probublica: id,name,first,last,compas_screening_date,sex,dob,age,age_cat,race,juv_fel_count,decile_score,juv_misd_count,juv_other_count,priors_count,days_b_screening_arrest,c_jail_in,c_jail_out,c_case_number,c_offense_date,c_arrest_date,c_days_from_compas,c_charge_degree,c_charge_desc,is_recid,num_r_cases,r_case_number,r_charge_degree,r_days_from_arrest,r_offense_date,r_charge_desc,r_jail_in,r_jail_out,is_violent_recid,num_vr_cases,vr_case_number,vr_charge_degree,vr_offense_date,vr_charge_desc,v_type_of_assessment,v_decile_score,v_score_text,v_screening_date,type_of_assessment,decile_score,score_text,screening_date
// propublica-two-years: id,name,first,last,compas_screening_date,sex,dob,age,age_cat,race,juv_fel_count,decile_score,juv_misd_count,juv_other_count,priors_count,days_b_screening_arrest,c_jail_in,c_jail_out,c_case_number,c_offense_date,c_arrest_date,c_days_from_compas,c_charge_degree,c_charge_desc,is_recid,r_case_number,r_charge_degree,r_days_from_arrest,r_offense_date,r_charge_desc,r_jail_in,r_jail_out,violent_recid,is_violent_recid,vr_case_number,vr_charge_degree,vr_offense_date,vr_charge_desc,type_of_assessment,decile_score,score_text,screening_date,v_type_of_assessment,v_decile_score,v_score_text,v_screening_date,in_custody,out_custody,priors_count,start,end,event,two_year_recid
const SAMPLE_SIZE = 1000;
const CHART_WIDTH = window.screen.width / 3 - 200;
const CHART_HEIGHT = (window.screen.height - 300) / 2;
const PERSON_RADIUS = 100;
/* ############################################################### */
const RISK_SCORE_RANGE = "datum.decile_score > 0 & datum.decile_score <= 10";
const dividerThickness = 4;
const svgWidth = 900;
const svgHeight = 900;
/* ############################################################### */

// via http://using-d3js.com/05_10_symbols.html
var customSymbolSquare = {
	draw: function (context, size) {
		let s = Math.sqrt(size) / 2;
		context.moveTo(s, s);
		context.lineTo(s, -s);
		context.lineTo(-s, -s);
		context.lineTo(-s, s);
		context.closePath();
	},
};
const customSqr = d3
	.symbol()
	.type(customSymbolSquare)
	.size(PERSON_RADIUS * 2);

// Runs when the page (and libraries) are loaded
window.onload = () => {
	// Source: https://observablehq.com/@vega/vega-lite-api#standalone_use
	const options = {
		view: {
			renderer: "canvas",
		},
	};
	// register vega and vega-lite with the API
	vl.register(vega, vegaLite, options);

	// Read in the data
	getJSONdata((ogData) => {
		// Add fields for ease of use
		ogData.map((d) => {
			d["jail_recommended"] = d["decile_score"] >= 7 ? 1 : 0;
			d["did_recidivate"] = d["two_year_recid"];
			d["radius"] = Math.sqrt(PERSON_RADIUS);

			if (d.jail_recommended === 1 && d.did_recidivate === 1) {
				d["outcome"] = "true_positive";
			} else if (d.jail_recommended === 1 && d.did_recidivate === 0) {
				d["outcome"] = "false_positive";
			} else if (d.jail_recommended === 0 && d.did_recidivate === 0) {
				d["outcome"] = "true_negative";
			} else if (d.jail_recommended === 0 && d.did_recidivate === 1) {
				d["outcome"] = "false_negative";
			}
		});
		// Sample the data
		const data = getRandomSubarray(ogData, SAMPLE_SIZE);

		// Add eventListeners for interactive inputs
		document
			.getElementById("antiClassification2select")
			.addEventListener("input", (e) => {
				// Remove existing charts
				const list = document.getElementById("antiClassification2");
				while (list.hasChildNodes()) {
					list.removeChild(list.firstChild);
				}

				// Generate the new charts, one for each possible value
				const key = e.target.value;
				const options = getValueOptions(data, key);
				// TODO: all of these should have the same axes (% of that group) and legends -- small multiples in vega-lite
				// TODO: add titles, adjust width to number of facets
				options.forEach((option) => {
					let filterStr = `datum.${key} == "${option}"`;
					riskScoreFrequencyFiltered(data, "antiClassification2", filterStr);
				});
				// riskScoreFrequencyFilteredMultiples(data, "antiClassification2", key);
			});

		// TODO: should resample here so same number of people
		document
			.getElementById("confusionMatrixSelect")
			.addEventListener("input", (e) => {
				const key = e.target.value;
				const options = getValueOptions(data, key);

				// Remove existing charts
				d3.select("#confusionMatrix").selectAll("svg").remove();

				if (key === "all") {
					clusterDots(
						data,
						d3
							.select("#confusionMatrix")
							.append("svg")
							.attr("width", 90 / options.length + "%")
							.attr("height", svgHeight)
					);
				} else {
					options.forEach((option) => {
						const tmp = d3
							.select("#confusionMatrix")
							.append("svg")
							.attr("width", 90 / options.length + "%")
							.attr("height", svgHeight);

						clusterDots(
							data.filter((d) => {
								return d[key] === option;
							}),
							tmp
						);

						tmp
							.append("text")
							.attr("x", 100)
							.attr("y", 100)
							.attr("font-size", "40px")
							.text(option);
					});
				}
			});

		// inframarginality
		document
			.getElementById("inframarginalitySelect")
			.addEventListener("input", (e) => {
				const key = e.target.value;
				const options = getValueOptions(data, key);

				// Remove existing charts
				d3.select("#inframarginality").selectAll("svg").remove();

				if (key === "all") {
					makeInframarginality(
						data,
						d3
							.select("#inframarginality")
							.append("svg")
							.attr("width", "100%")
							.attr("height", svgHeight)
					);
				} else {
					options.forEach((option) => {
						const tmp = d3
							.select("#inframarginality")
							.append("svg")
							.attr("width", 100 / options.length + "%")
							.attr("height", svgHeight);

						makeInframarginality(
							data.filter((d) => {
								return d[key] === option;
							}),
							tmp
						);

						tmp
							.append("text")
							.attr("x", 100)
							.attr("y", 100)
							.attr("font-size", "40px")
							.text(option);
					});
				}
			});

		// Make initial graphs
		// TODO: add line of best fit to this
		riskScoreFrequency(data, "antiClassification1");

		/* ########################### Confusion Matrix ########################## */
		// Create the SVG
		clusterDots(
			data,
			d3
				.select("#confusionMatrix")
				.append("svg")
				.attr("width", svgWidth)
				.attr("height", svgHeight)
		);

		makeInframarginality(
			data,
			d3
				.select("#inframarginality")
				.append("svg")
				.attr("width", svgWidth)
				.attr("height", svgHeight)
		);

		/* ########################### Infra-Marginality ########################## */

		// End of access to data
	});
};

//* ########################### Inframarginality ########################## */
function makeInframarginality(data, svg) {
	const margin = 40;
	const axisTitleSize = 30;
	const tickLabelSize = 20;

	const width = parseFloat(svg.style("width"));
	const height = parseFloat(svg.style("height"));

	// X axis
	const xScale = d3
		.scaleLinear()
		.domain([11, 0]) // unclear why this is in reverse order
		.range([width - margin * 2, margin]);

	svg
		.append("g")
		.attr(
			"transform",
			`translate(${margin}, ${height - tickLabelSize - margin})`
		)
		.call(d3.axisBottom(xScale))
		.selectAll("text")
		.attr("transform", `translate(${tickLabelSize / 2 - 3},0)rotate(0)`)
		.attr("font-size", tickLabelSize)
		.style("text-anchor", "end");

	// add x-axis title
	svg
		.append("text")
		.attr("x", width / 2)
		.attr("y", height)
		.attr("font-size", axisTitleSize)
		.text("Risk Score");

	// Add Y axis
	const yScale = d3
		.scaleLinear()
		.domain([0, 225])
		.range([height - margin, margin]);

	svg
		.append("g")
		.attr("transform", `translate(${margin * 2}, ${-tickLabelSize})`)
		.call(d3.axisLeft(yScale))
		.selectAll("text")
		.attr("transform", `translate(${tickLabelSize / 2 - 6},0)rotate(0)`)
		.attr("font-size", tickLabelSize)
		.style("text-anchor", "end");

	// add y-axis title, remember that all transformations are around the (0, 0) origin
	svg
		.append("text")
		.attr("x", -(margin + height / 2))
		.attr("y", axisTitleSize)
		.attr("transform", `rotate(-90)`) // rotate it by -90 degrees
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize)
		.text("Number of People");

	// Append a vertical line to highlight the separation
	let cutoffScore = 7;

	// Create an event
	const dispatch = d3.dispatch("lineDragged");

	const cutoffLine = svg
		.append("line")
		.attr("y1", height - margin - tickLabelSize)
		.attr("y2", 0)
		.attr("stroke", "purple")
		.attr("stroke-width", 10)
		.attr("opacity", 0.35)
		.attr("cursor", "col-resize")
		.call(
			d3
				.drag()
				.on("start", () => {
					svg.attr("cursor", "col-resize");
				})
				.on("drag", (event, d) => {
					// invert = from output of scale, get risk score
					let currLineScore = xScale.invert(event.x);
					// If we've moved far enough on the range, then react
					if (Math.abs(currLineScore - cutoffScore) >= 0.5) {
						cutoffScore = Math.round(currLineScore);
						dispatch.call("lineDragged");
					}
				})
				.on("end", () => {
					svg.attr("cursor", "default");
				})
		);

	// Add the people
	// TODO: add something to indicate if recidivated or not
	for (let i = 1; i <= 10; i++) {
		svg
			.selectAll("mycircle")
			.data(
				data.filter((d) => {
					return d["decile_score"] === i;
				})
			)
			.join("circle")
			.attr("r", "5")
			.attr("stroke", (d) => {
				return d.did_recidivate ? "black" : "transparent";
			})
			.attr("stroke-width", 1)
			.attr("transform", (d, j) => {
				return `translate(${
					xScale(d.decile_score) - 20 + (j % 5) * 11 + margin
				}, ${yScale(Math.floor(j / 5) * 5) - 6 - tickLabelSize})`;
			});
	}

	// add chart title and subtitle
	svg
		.append("text")
		.attr("x", width / 2 + margin)
		.attr("y", axisTitleSize * 2 + margin)
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize * 2)
		.text("Risk Distribution");

	const jailedText = svg
		.append("text")
		.attr("x", width / 2 + margin)
		.attr("y", axisTitleSize * 2 + 2 * margin)
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize);

	function lineHasMoved() {
		cutoffLine
			.attr("x1", xScale(cutoffScore) + 6)
			.attr("x2", xScale(cutoffScore) + 6);

		let numJailed = 0;
		let numJailedInnocent = 0;
		svg.selectAll("circle").attr("fill", (d) => {
			if (d.decile_score >= cutoffScore) {
				// Keep track of number jailed
				if (!d.did_recidivate) {
					numJailedInnocent++;
				}
				numJailed++;

				return "orange";
			} else {
				return "grey";
			}
		});

		jailedText.text(
			`Jailed Needlessly: ${
				Math.round((numJailedInnocent / numJailed) * 100) || 0
			}%`
		);
	}

	lineHasMoved();
	dispatch.on("lineDragged", lineHasMoved);
}

//* ########################### Confusion Matrix ########################## */
function clusterDots(data, svg) {
	// via https://stackoverflow.com/a/40922248
	const width = parseFloat(svg.style("width"));
	const height = parseFloat(svg.style("height"));

	// Center of cluster for each box in confusion matrix
	const centers = {
		true_positive: {
			cx: dividerThickness + width * (1 / 4),
			cy: dividerThickness + height * (1 / 4),
		},
		false_positive: {
			cx: dividerThickness + width * (3 / 4),
			cy: dividerThickness + height * (1 / 4),
		},
		false_negative: {
			cx: dividerThickness + width * (1 / 4),
			cy: dividerThickness + height * (3 / 4),
		},
		true_negative: {
			cx: dividerThickness + width * (3 / 4),
			cy: dividerThickness + height * (3 / 4),
		},
	};

	// via https://www.d3indepth.com/force-layout/
	d3.forceSimulation(data)
		// a positive value will cause elements to attract one another while a negative value causes elements to repel each other.
		// .force("charge", d3.forceManyBody().strength(-1))
		.force(
			"x",
			d3
				.forceX()
				.x((d) => {
					return centers[d["outcome"]]["cx"];
				})
				.strength(1)
		)
		.force(
			"y",
			d3
				.forceY()
				.y((d) => {
					return centers[d["outcome"]]["cy"];
				})
				.strength(1)
		)
		.force(
			"collision",
			d3.forceCollide().radius((d) => {
				return d.radius;
			})
		)
		.on("tick", ticked);

	function ticked() {
		svg
			.selectAll("path")
			.data(data)
			.join((enter) => {
				return enter
					.append("path")
					.attr("d", customSqr)
					.attr("transform", `translate(${width / 2},${height / 2})`);
			})
			// Orange = predicted to recidivate
			.attr("fill", (d) => {
				if (d.jail_recommended) {
					return "orange";
				} else {
					return "grey";
				}
			})
			// Border = did actually recidivate
			.attr("stroke", (d) => {
				if (d.two_year_recid) {
					return "black";
				} else {
					return "none";
				}
			})
			.transition()
			.ease(d3.easeCubicOut)
			.duration(4000)
			.attr("transform", (d) => {
				return `translate(${d.x},${d.y})`;
			});
	}
}

//* ########################### Anti-Classification Section ########################## */
// TODO: do this in D3 https://observablehq.com/@d3/beeswarm
function riskScoreFrequency(data, id) {
	const points = vl.markPoint().encode(
		vl.x().fieldO("decile_score").axis({
			title: "Risk Score",
			titleAnchor: "center",
			labelAngle: 0,
		}),
		vl.xOffset().fieldQ("age"),
		vl.y().fieldO("index").axis(null).sort("descending"),
		vl.color().fieldN("race")
	);

	const rectangles = vl
		.markRect({ stroke: "black", fill: "transparent" })
		.encode(
			vl.x().fieldO("decile_score"),
			vl.y().count().axis({ title: "Number of People" })
		);

	vl.layer(points, rectangles)
		.data(data)
		.transform(
			vl.window(vl.row_number().as("index")).groupby("decile_score"),
			// TODO: fix jitter: https://vega.github.io/vega-lite/examples/point_offset_random.html
			// vl.calculate(Math.random() * 10).as("jitter"),
			vl.filter(RISK_SCORE_RANGE)
		)
		.width(CHART_WIDTH)
		.height(CHART_HEIGHT)
		.render()
		.then((viewElement) => {
			document.getElementById(id).appendChild(viewElement);
		});
}

function riskScoreFrequencyFiltered(data, id, filterStr) {
	const points = vl.markPoint().encode(
		vl.x().fieldO("decile_score").axis({
			title: "Risk Score",
			titleAnchor: "center",
			labelAngle: 0,
		}),
		vl.y().fieldO("index").axis(null).sort("descending"),
		vl.color().fieldN("race"),
		vl.xOffset().fieldQ("age")
	);

	const rectangles = vl
		.markRect({ stroke: "black", fill: "transparent" })
		.encode(
			vl.x().fieldO("decile_score"),
			vl.y().count().axis({ title: "Number of People" })
		);

	vl.layer(points, rectangles)
		.data(data)
		.transform(
			vl.window(vl.row_number().as("index")).groupby("decile_score"),
			vl.filter(`${filterStr} & ${RISK_SCORE_RANGE}`)
		)
		.width(CHART_WIDTH)
		.height(CHART_HEIGHT)
		.render()
		.then((viewElement) => {
			const wrapper = document.createElement("div");
			wrapper.classList.add("chartWrapper");
			document.getElementById(id).appendChild(wrapper).appendChild(viewElement);
		});
}

// Running into bug making small multiples: https://github.com/vega/vega-lite/issues/4373
function riskScoreFrequencyFilteredMultiples(data, id, key) {
	const points = vl
		.markPoint()
		.data(data)
		.transform(
			vl.window(vl.row_number().as("index")).groupby("decile_score"),
			vl.filter(RISK_SCORE_RANGE)
		)
		.encode(
			vl.x().fieldO("decile_score"),
			vl.xOffset().fieldQ("age"),
			vl.y().fieldO("index").axis(null).sort("descending"),
			vl.color().fieldN("race")
		);

	const d = [...data];

	const rectangles = vl
		.markRect({ stroke: "black", fill: "transparent" })
		.data(data)
		.transform(
			vl.window(vl.row_number().as("index")).groupby("decile_score"),
			vl.filter(RISK_SCORE_RANGE)
		)
		.encode(
			vl.x().fieldO("decile_score").axis({
				title: "Risk Score",
				titleAnchor: "center",
				labelAngle: 0,
			}),
			vl.y().count().axis({ title: "Number of People" })
		);

	vl.layer(points, rectangles)
		// rectangles
		// .facet({ column: vl.field(key) })

		.width(CHART_WIDTH)
		.height(CHART_HEIGHT)
		.render()
		.then((viewElement) => {
			const wrapper = document.createElement("div");
			wrapper.classList.add("chartWrapper");
			document.getElementById(id).appendChild(wrapper).appendChild(viewElement);
		});
}

/* ########################### Helper Functions ########################## */
function getValueOptions(data, key) {
	const optionsSet = new Set();
	data.map((obj) => optionsSet.add(obj[key]));
	return [...optionsSet];
}

// Source: https://stackoverflow.com/a/34579496
function getJSONdata(callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType("application/json");
	rawFile.open("GET", PATH_TO_DATA, true);
	rawFile.onreadystatechange = function () {
		if (rawFile.readyState === 4 && rawFile.status == "200") {
			callback(JSON.parse(rawFile.responseText));
		}
	};
	rawFile.send(null);
}

// Source: https://stackoverflow.com/a/11935263
function getRandomSubarray(arr, size) {
	var shuffled = arr.slice(0),
		i = arr.length,
		min = i - size,
		temp,
		index;
	while (i-- > min) {
		index = Math.floor((i + 1) * Math.random());
		temp = shuffled[index];
		shuffled[index] = shuffled[i];
		shuffled[i] = temp;
	}
	return shuffled.slice(min);
}
