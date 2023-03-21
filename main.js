/* ########################### Constants ########################## */
const PATH_TO_DATA = "/data/propublica.json";
// Columns: id,name,first,last,compas_screening_date,sex,dob,age,age_cat,race,juv_fel_count,decile_score,juv_misd_count,juv_other_count,priors_count,days_b_screening_arrest,c_jail_in,c_jail_out,c_case_number,c_offense_date,c_arrest_date,c_days_from_compas,c_charge_degree,c_charge_desc,is_recid,num_r_cases,r_case_number,r_charge_degree,r_days_from_arrest,r_offense_date,r_charge_desc,r_jail_in,r_jail_out,is_violent_recid,num_vr_cases,vr_case_number,vr_charge_degree,vr_offense_date,vr_charge_desc,v_type_of_assessment,v_decile_score,v_score_text,v_screening_date,type_of_assessment,decile_score,score_text,screening_date

/* ############################################################### */

window.onload = () => {
	// Source: https://observablehq.com/@vega/vega-lite-api#standalone_use
	// setup API options
	const options = {
		view: {
			renderer: "canvas",
		},
	};

	// register vega and vega-lite with the API
	vl.register(vega, vegaLite, options);
	// now you can use the API!

	getJSONdata((data) => {
		const testPlot = vl
			.markPoint({ shape: "M-5,-5 L5,5 V-5 L-5,5 Z", opacity: 0.25 })
			.data(data)
			.encode(vl.x().fieldQ("priors_count"), vl.y().fieldQ("decile_score"));

		vl.layer(testPlot)
			.width(1400)
			.height(600)
			// .title({
			// 	text: "here is my title",
			// 	fontSize: 45,
			// })
			.render()
			.then((viewElement) => {
				// render returns a promise to a DOM element containing the chart
				// viewElement.value contains the Vega View object instance
				document.getElementById("view").appendChild(viewElement);
			});
	});
};

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
