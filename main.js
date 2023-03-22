/* ########################### Constants ########################## */
const PATH_TO_DATA = "/data/propublica.json";
// Columns: id,name,first,last,compas_screening_date,sex,dob,age,age_cat,race,juv_fel_count,decile_score,juv_misd_count,juv_other_count,priors_count,days_b_screening_arrest,c_jail_in,c_jail_out,c_case_number,c_offense_date,c_arrest_date,c_days_from_compas,c_charge_degree,c_charge_desc,is_recid,num_r_cases,r_case_number,r_charge_degree,r_days_from_arrest,r_offense_date,r_charge_desc,r_jail_in,r_jail_out,is_violent_recid,num_vr_cases,vr_case_number,vr_charge_degree,vr_offense_date,vr_charge_desc,v_type_of_assessment,v_decile_score,v_score_text,v_screening_date,type_of_assessment,decile_score,score_text,screening_date
const SAMPLE_SIZE = 1000;
const CHART_WIDTH = window.screen.width / 3 - 200;
const CHART_HEIGHT = (window.screen.height - 300) / 2;
/* ############################################################### */
const RISK_SCORE_RANGE = "datum.decile_score > 0 & datum.decile_score <= 10";
/* ############################################################### */

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

		// Make initial graphs
		// TODO: add line of best fit to this
		riskScoreFrequency(data, "antiClassification1");
	});
};

//* ########################### Anti-Classification Section ########################## */
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
