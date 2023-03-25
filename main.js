/* ########################### Constants ########################## */
const DATA_URL =
	"https://raw.githubusercontent.com/TheFirstQuestion/algorithmic-fairness-explorable-explanation/main/data/propublica-two-years.json";
// TODO: pick a good sample size
const SAMPLE_SIZE = 1200;
const MIN_SUBSAMPLE_SIZE = 75;
const CHART_WIDTH = window.screen.width / 3 - 200;
const CHART_HEIGHT = (window.screen.height - 300) / 2;
const PERSON_RADIUS = 100;
/* ############################################################### */
const svgWidth = 900;
const svgHeight = 900;
const weekdays = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];
// set2 from https://observablehq.com/@d3/color-schemes
const optionColors = [
	"#66c2a5",
	"#fc8d62",
	"#8da0cb",
	"#e78ac3",
	"#a6d854",
	"#ffd92f",
	"#e5c494",
	"#b3b3b3",
];
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
	// Read in the data
	// getJSONdata((ogData) => {
	d3.json(DATA_URL, {}).then((ogData) => {
		// Add and/or rename fields
		ogData.map((d) => {
			d["jail_recommended"] = d["decile_score"] >= 7 ? 1 : 0;
			d["did_recidivate"] = d["two_year_recid"];
			d["radius"] = Math.sqrt(PERSON_RADIUS);

			// via https://stackoverflow.com/a/51241958
			d["name_begins_with_vowel"] = d["first"].match("^[aieouAIEOU].*")
				? "Vowel"
				: "Consonant";

			d["charge_degree"] =
				d["c_charge_degree"] === "M" ? "Misdemeanor" : "Felony";

			// Rename so alphabetize sensically
			if (d.age_cat === "Greater than 45") {
				d.age_cat = "45 or older";
			} else if (d.age_cat === "Less than 25") {
				d.age_cat = "25 or younger";
			} else if (d.age_cat === "25 - 45") {
				d.age_cat = "25 to 45";
			}

			d["day_of_week"] = weekdays[new Date(d.dob).getDay()];

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

		/* ########################### Confusion Matrix ########################## */
		document
			.getElementById("confusionMatrixSelect")
			.addEventListener("input", (e) => {
				const key = e.target.value;
				const options = getValueOptions(data, key);

				// Remove existing charts
				d3.select("#confusionMatrix").selectAll("svg").remove();

				if (key === "all") {
					clusterDots(
						getRandomSubarray(data, MIN_SUBSAMPLE_SIZE * 2),
						d3
							.select("#confusionMatrix")
							.append("svg")
							.attr("width", "90%")
							.attr("height", svgHeight)
					);
				} else {
					options.forEach((option) => {
						const thisSubset = ogData.filter((d) => {
							return d[key] === option;
						});

						// Ensure reasonable sample size
						if (thisSubset.length > MIN_SUBSAMPLE_SIZE * 3) {
							const tmp = d3
								.select("#confusionMatrix")
								.append("svg")
								.attr("width", 95 / options.length + "%");

							// Ensure same number of people in each
							clusterDots(
								getRandomSubarray(thisSubset, MIN_SUBSAMPLE_SIZE * 3),
								tmp
							);

							tmp
								.append("text")
								.attr("x", "50%")
								.attr("y", "50%")
								.attr("text-anchor", "middle")
								.attr("font-size", "40px")
								.text(option);
						}
					});
				}
			});

		/* ########################### Infra-Marginality ########################## */
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
							.attr("width", "80%")
							.attr("height", svgHeight),
						d3.dispatch("lineDragged"),
						"lineDragged"
					);
				} else {
					options.forEach((option) => {
						const tmp = d3
							.select("#inframarginality")
							.append("svg")
							.attr("width", 90 / options.length + "%");
						// Height will be same, to maintain aspect ratio (per css)

						const thisData = data.filter((d) => {
							return d[key] === option;
						});

						if (thisData.length > MIN_SUBSAMPLE_SIZE) {
							makeInframarginality(
								thisData,
								tmp,
								d3.dispatch("lineDragged"),
								"lineDragged"
							);

							tmp
								.append("text")
								.attr("x", 100)
								.attr("y", 50)
								.attr("font-size", "40px")
								.text(option);
						}
					});
				}
			});

		// Super terrible, slightly modified copy/paste of above
		document
			.getElementById("inframarginalityConnectedSelect")
			.addEventListener("input", (e) => {
				const key = e.target.value;
				const options = getValueOptions(data, key);

				// Remove existing charts
				d3.select("#inframarginalityConnected").selectAll("svg").remove();
				const dispatchConnected = d3.dispatch("connectedLineDragged");

				if (key === "all") {
					makeInframarginality(
						data,
						d3
							.select("#inframarginalityConnected")
							.append("svg")
							.attr("width", "80%")
							.attr("height", svgHeight),
						dispatchConnected,
						"connectedLineDragged"
					);
				} else {
					options.forEach((option) => {
						let thisData = data.filter((d) => {
							return d[key] === option;
						});

						if (thisData.length > MIN_SUBSAMPLE_SIZE) {
							const tmp = d3
								.select("#inframarginalityConnected")
								.append("svg")
								.attr("width", 90 / options.length + "%");
							// Height will be same, to maintain aspect ratio (per css)

							makeInframarginality(
								thisData,
								tmp,
								dispatchConnected,
								"connectedLineDragged"
							);

							tmp
								.append("text")
								.attr("x", 100)
								.attr("y", 50)
								.attr("font-size", "40px")
								.text(option);
						}
					});
				}
			});

		/* ########################### Anti-Classification ########################## */
		// Make initial graphs
		// TODO: add line of best fit to this

		makeAntiClassification(
			data,
			d3
				.select("#antiClassification")
				.append("svg")
				.attr("width", "80%")
				.attr("height", svgHeight)
		);

		// Anti-Classification
		document
			.getElementById("antiClassificationSelect")
			.addEventListener("input", (e) => {
				const key = e.target.value;
				const options = getValueOptions(data, key);

				// Remove existing charts
				d3.select("#antiClassification").selectAll("svg").remove();

				if (key === "all") {
					makeAntiClassification(
						data,
						d3
							.select("#antiClassification")
							.append("svg")
							.attr("width", "80%")
							.attr("height", svgHeight)
					);
				} else {
					options.forEach((option) => {
						const thisData = data.filter((d) => {
							return d[key] === option;
						});

						if (thisData.length > MIN_SUBSAMPLE_SIZE) {
							const tmp = d3
								.select("#antiClassification")
								.append("svg")
								.attr("width", 90 / options.length + "%");
							// Height will be same, to maintain aspect ratio (per css)

							makeAntiClassification(thisData, tmp);
							tmp
								.append("text")
								.attr("x", 100)
								.attr("y", 50)
								.attr("font-size", "40px")
								.text(option);
						}
					});
				}
			});

		/* ########################### Confusion Matrix ########################## */
		clusterDots(
			data,
			d3
				.select("#confusionMatrix")
				.append("svg")
				.attr("id", "confusionMatrixSVG")
				.attr("width", "90%")
				.attr("height", svgHeight)
		);
		drawFence();

		makeInframarginality(
			data,
			d3
				.select("#inframarginality")
				.append("svg")
				.attr("width", "80%")
				.attr("height", svgHeight),
			d3.dispatch("lineDragged"),
			"lineDragged"
		);

		/* ########################### Connected Inframarginality ########################## */
		makeInframarginality(
			data,
			d3
				.select("#inframarginalityConnected")
				.append("svg")
				.attr("width", "80%")
				.attr("height", svgHeight),
			d3.dispatch("connectedLineDragged"),
			"connectedLineDragged"
		);

		/* ########################### Calibration ########################## */
		initialCalibration(data);

		// End of access to data
	});
};

/* ########################### Anti-Classification ########################## */

function makeAntiClassification(data, svg) {
	const margin = 40;
	const axisTitleSize = 30;
	const tickLabelSize = 20;

	const width = parseFloat(svg.style("width"));
	const height = parseFloat(svg.style("height"));

	const widthOfDot = 8;
	const numDotsAcross = Math.floor(width / (10 * widthOfDot) / 2);

	// X axis
	const xScale = d3
		.scaleLinear()
		.domain([11, 0]) // unclear why this is in reverse order
		.range([width - margin * 2 - axisTitleSize, margin]);

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
		.domain([0, 1000 / numDotsAcross])
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
		.attr("transform", `rotate(-90)`)
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize)
		.text("Number of People");

	// Add the people
	for (let i = 1; i <= 10; i++) {
		svg
			.selectAll("mycircle")
			.data(
				data.filter((d) => {
					return d["decile_score"] === i;
				})
			)
			.join("circle")
			.attr("r", widthOfDot / 2)
			.attr("stroke-width", 2)
			// TODO: make sure these line up with axis... make them taller than wide?
			.attr("transform", (d, j) => {
				return `translate(${
					xScale(d.decile_score) -
					(widthOfDot * numDotsAcross) / 2 +
					(j % numDotsAcross) * (widthOfDot + 1) +
					margin
				}, ${
					yScale((Math.floor(j / numDotsAcross) * widthOfDot) / 2) -
					6 -
					tickLabelSize
				})`;
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
}

/* ########################### Calibration ########################## */

function initialCalibration(data) {
	const width = svgWidth;
	const height = svgHeight;
	const tickLabelSize = 20;

	const svg = d3
		.select("#calibrationDiv")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	const margin = 40;
	const axisTitleSize = 30;
	const gridLineColor = "#dedede";

	// X axis
	const xScale = d3
		.scaleLinear()
		.domain([11, 0]) // unclear why this is in reverse order
		.range([width - margin * 2 - axisTitleSize, margin]);
	svg
		.append("g")
		.attr(
			"transform",
			`translate(${margin}, ${height - tickLabelSize - margin})`
		)
		// tickSize = gridlines
		.call(d3.axisBottom(xScale).tickSize(-height))
		.selectAll("text")
		.attr("transform", `translate(${tickLabelSize / 2 - 3},0)rotate(0)`)
		.attr("fill", "black")
		.attr("font-size", tickLabelSize)
		.style("text-anchor", "end");

	// Style gridlines -- tick labels must specify above
	svg.selectAll(".tick").attr("color", gridLineColor);

	// x-axis title
	svg
		.append("text")
		.attr("x", width / 2)
		.attr("y", height)
		.attr("font-size", axisTitleSize)
		.text("Risk Score");

	// Add Y axis
	const yScale = d3
		.scaleLinear()
		.domain([0, 100])
		.range([height - margin, margin]);
	svg
		.append("g")
		.attr("transform", `translate(${margin * 2}, ${-tickLabelSize})`)
		// tickSize = gridlines
		.call(d3.axisLeft(yScale).tickSize(-width))
		.selectAll("text")
		.attr("fill", "black")
		.attr("transform", `translate(${tickLabelSize / 2 - 6},0)rotate(0)`)
		.attr("font-size", tickLabelSize)
		.style("text-anchor", "end");

	// Style gridlines -- tick labels must specify above
	svg.selectAll(".tick").attr("color", gridLineColor);

	// y-axis title
	svg
		.append("text")
		.attr("x", -(margin + height / 2))
		.attr("y", axisTitleSize)
		.attr("transform", `rotate(-90)`)
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize)
		.text("% who Recidivated");

	function makePercentDots(data, color) {
		// Add the people
		const thisGroup = svg.append("g").attr("class", "dotLayer");

		// via https://stackoverflow.com/a/65745675
		const dataMap = d3.rollup(
			data,
			(v) => v.length,
			(d) => d.decile_score,
			(d) => d.did_recidivate
		);

		// Add the line
		thisGroup
			.append("path")
			.datum(d3.sort(dataMap, (d) => d[0]))
			.attr("fill", "none")
			.attr("stroke", color)
			.attr("stroke-width", 1.5)
			.attr(
				"d",
				d3
					.line()
					.x((d) => xScale(d[0]) + margin)
					.y(
						(d) =>
							yScale((100 * d[1].get(1)) / (d[1].get(1) + d[1].get(0))) ||
							0 + tickLabelSize
					)
			);

		thisGroup
			.selectAll("circle")
			.data(dataMap)
			.join("circle")
			.attr("r", 10)
			.attr("fill", color)
			.attr("transform", (d) => {
				return `translate(${xScale(d[0]) + margin}, ${
					yScale((100 * d[1].get(1)) / (d[1].get(1) + d[1].get(0))) ||
					0 + tickLabelSize
				})`;
			});
	}

	makePercentDots(data, "black");

	// add chart title
	svg
		.append("text")
		.attr("x", width / 2 + margin)
		.attr("y", axisTitleSize * 2 + margin)
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize * 2)
		.text("Accuracy");

	// TODO: add legend
	document
		.getElementById("calibrationSelect")
		.addEventListener("input", (e) => {
			const key = e.target.value;
			const options = getValueOptions(data, key);

			// Remove existing charts
			svg.selectAll(".dotLayer").remove();
			svg.selectAll(".legendText").remove();
			// Add back the initial dots
			makePercentDots(data, "black");

			if (key !== "all") {
				svg
					.append("text")
					.attr("class", "legendText")
					.attr("x", margin + width / 12)
					.attr("y", axisTitleSize * 2 + 2 * margin - axisTitleSize)
					.attr("text-anchor", "left")
					.attr("font-size", axisTitleSize)
					.attr("fill", "black")
					.text("All");

				let count = 0;
				options.forEach((option) => {
					const thisSubset = data.filter((d) => {
						return d[key] === option;
					});
					// Make sure there is enough data for it to be reasonable
					if (thisSubset.length >= MIN_SUBSAMPLE_SIZE) {
						makePercentDots(thisSubset, optionColors[count]);

						// Add text to legend
						svg
							.append("text")
							.attr("class", "legendText")
							.attr("x", margin + width / 12)
							.attr("y", axisTitleSize * 2 + 2 * margin + count * axisTitleSize)
							.attr("text-anchor", "left")
							.attr("font-size", axisTitleSize)
							.attr("fill", optionColors[count])
							.text(option);

						count++;
					}
				});
			}
		});
}

/* ########################### Inframarginality ########################## */
function makeInframarginality(data, svg, dispatch, eventName) {
	const margin = 40;
	const axisTitleSize = 30;
	const tickLabelSize = 20;

	const width = parseFloat(svg.style("width"));
	const height = parseFloat(svg.style("height"));

	const widthOfDot = 8;
	const numDotsAcross = Math.floor(width / (10 * widthOfDot) / 2);

	// X axis
	const xScale = d3
		.scaleLinear()
		.domain([11, 0]) // unclear why this is in reverse order
		.range([width - margin * 2 - axisTitleSize, margin]);

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
		.domain([0, 1000 / numDotsAcross])
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
		.attr("transform", `rotate(-90)`)
		.attr("text-anchor", "middle")
		.attr("font-size", axisTitleSize)
		.text("Number of People");

	// Add the threshold line
	let cutoffScore = 7;
	const cutoffLine = svg
		.append("line")
		.attr("y1", height - margin - tickLabelSize)
		.attr("y2", axisTitleSize * 2 + 3 * margin)
		.attr("class", eventName)
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
				.on("drag", function (event) {
					// TODO: prevent from going past 0 / 11
					// invert = from output of scale, get risk score
					let currLineScore = xScale.invert(event.x);
					// If we've moved far enough on the range, then react
					if (Math.abs(currLineScore - cutoffScore) >= 0.5) {
						cutoffScore = Math.round(currLineScore);
						dispatch.call(eventName, this, cutoffScore);
					}
				})
				.on("end", () => {
					svg.attr("cursor", "default");
				})
		);

	// Add the people
	for (let i = 1; i <= 10; i++) {
		svg
			.selectAll("mycircle")
			.data(
				data.filter((d) => {
					return d["decile_score"] === i;
				})
			)
			.join("circle")
			.attr("r", widthOfDot / 2)
			.attr("stroke", (d) => {
				return d.did_recidivate ? "black" : "transparent";
			})
			.attr("stroke-width", 2)
			// TODO: make sure these line up with axis... make them taller than wide?
			.attr("transform", (d, j) => {
				return `translate(${
					xScale(d.decile_score) -
					(widthOfDot * numDotsAcross) / 2 +
					(j % numDotsAcross) * (widthOfDot + 1) +
					margin
				}, ${
					yScale((Math.floor(j / numDotsAcross) * widthOfDot) / 2) -
					6 -
					tickLabelSize
				})`;
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
		.attr("fill", "orange")
		.attr("font-size", axisTitleSize);

	// The dot allows multiple things to respond to eventName
	dispatch.on(`${eventName}.${Date.now()}`, function (cutoffScore) {
		// Line's x position
		cutoffLine
			.attr("x1", xScale(cutoffScore - 0.5) + margin)
			.attr("x2", xScale(cutoffScore - 0.5) + margin);

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
	});

	dispatch.call(eventName, this, cutoffScore);
}

//* ########################### Confusion Matrix ########################## */
// TODO: this doesn't work
function drawFence() {
	const svg = d3.select("#confusionMatrixSVG").append("g");
	const width = parseFloat(svg.style("width"));
	const height = parseFloat(svg.style("height"));

	svg
		.selectAll("circle")
		.join("circle")
		.append("circle")
		.attr("cx", 100)
		.attr("cy", 100)
		.attr("r", 50);

	const spacing = 10;

	for (let i = 0; i < 100; i++) {
		svg.select("path").attr("d", d3.line([i * spacing, i * spacing]));
	}
}

function clusterDots(data, svg) {
	// via https://stackoverflow.com/a/40922248
	const width = parseFloat(svg.style("width"));
	const height = parseFloat(svg.style("height"));

	// Center of cluster for each box in confusion matrix
	const centers = {
		true_positive: {
			cx: width * (1 / 4),
			cy: height * (1 / 4),
		},
		false_positive: {
			cx: width * (3 / 4),
			cy: height * (1 / 4),
		},
		false_negative: {
			cx: width * (1 / 4),
			cy: height * (3 / 4),
		},
		true_negative: {
			cx: width * (3 / 4),
			cy: height * (3 / 4),
		},
	};

	// via https://www.d3indepth.com/force-layout/
	d3.forceSimulation(data)
		// a positive value will cause elements to attract one another while a negative value causes elements to repel each other.
		.force("charge", d3.forceManyBody().strength(-10))
		.force(
			"x",
			d3
				.forceX()
				.x((d) => {
					return centers[d["outcome"]]["cx"];
				})
				.strength(2)
		)
		.force(
			"y",
			d3
				.forceY()
				.y((d) => {
					return centers[d["outcome"]]["cy"];
				})
				.strength(2)
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
				return (
					enter
						.append("path")
						.attr("d", customSqr)
						// Appear from the middle of the matrix
						.attr("transform", `translate(${width / 2},${height / 2})`)
				);
			})
			.attr("stroke-width", 3)
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
			.duration(2000)
			.attr("transform", (d) => {
				return `translate(${d.x},${d.y})`;
			});
	}
}

/* ########################### Helper Functions ########################## */
function getValueOptions(data, key) {
	// Don't bother processing and sorting bc we already know
	if (key === "day_of_week") {
		return weekdays;
	}

	const optionsSet = new Set();
	data.map((obj) => optionsSet.add(obj[key]));
	// Sort alphabetically
	return [...optionsSet].sort();
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
