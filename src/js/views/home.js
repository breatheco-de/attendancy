import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import Popover from "../component/popover";

const months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];

export const Home = props => {
	const [zoom, setZoom] = useState("font-size-10px");
	const [totalEveryone, setTotalEveryone] = useState(0);
	const [academies, setAcademies] = useState([]);
	const { store, actions } = useContext(Context);
	const params = new URLSearchParams(location.search);
	useEffect(() => {
		if (params.has("token")) {
			actions.getMe().then(me => {
				if (!me) return;
				let aca = me.roles.map(r => r.academy);
				setAcademies(aca);
				if (aca.length == 1 && !params.has("academy"))
					window.location.href = window.location.href + "&academy=" + aca[0].id;
			});
			if (params.has("academy")) {
				actions.getCohorts().then(data => actions.getTokensFromURL(props));
			}
			if (params.has("cohort_slug")) {
				const cohort_slug = params.get("cohort_slug");
				actions.getSingleCohort(cohort_slug).then(cohort => {
					actions.getStudentsAndActivities({ cohort, props });
				});
			}
		}
	}, []);
	const daysInCohort = store.current ? store.current.syllabus.certificate.duration_in_days : 0;
	const noData = <i className={`fas fa-exclamation-circle text-sand cursor-pointer ${zoom}`} />;
	const thumbsUp = <i className={`fas fa-thumbs-up text-darkgreen cursor-pointer ${zoom}`} />;
	const thumbsDown = <i className={`fas fa-thumbs-down text-darkred cursor-pointer ${zoom}`} />;

	if (!params.has("token"))
		return (
			<div className="alert alert-danger">
				Please{" "}
				<a href={`${process.env.API_URL}/v1/auth/view/login?url=${window.location.href}`}>log in first</a>
			</div>
		);

	if (!params.has("academy") && !params.has("cohort_slug") && academies.length > 1)
		return (
			<div className="alert alert-danger">
				Please choose an academy :
				<ul>
					{academies.map(a => (
						<li key={a.id}>
							<a href={`${window.location.href}&academy=${a.id}`}>{a.name}</a>
						</li>
					))}
				</ul>
			</div>
		);

	return (
		<div className="mt-2 p-3 line-height-1">
			<select
				className="mb-4"
				value={store.current ? store.current.slug : ""}
				onChange={e =>
					actions.getStudentsAndActivities({
						cohort: store.cohorts.find(c => c.slug === e.target.value),
						props
					})
				}>
				{store.cohorts.length > 0 ? (
					store.cohorts.map((e, i) => (
						<option key={i} value={e.slug}>
							{e.name}
						</option>
					))
				) : (
					<option value={null}>Loading cohorts...</option>
				)}
			</select>
			{params.has("error") ? (
				<div className="text-center my-5">
					<h2 className="mb-5">Try renewing the access token in the url</h2>
					<h4>?token=d08334cd029fc1fdeff7cff7b263bdefc3819661</h4>
				</div>
			) : params.has("cohort_slug") && !store.students ? (
				<h2 className="text-center my-5">Loading students...</h2>
			) : (
				params.has("cohort_slug") && (
					<div>
						<span className="position-absolute cursor-pointer" style={{ right: "50px", top: "30px" }}>
							{zoom.includes("10px") ? (
								<i className="fas fa-search-plus fa-lg" onClick={() => setZoom("font-size-25px")} />
							) : (
								<i className="fas fa-search-minus fa-lg" onClick={() => setZoom("font-size-10px")} />
							)}
						</span>
						<table className="d-inline-block cell-spacing">
							<tbody>
								{/*******************
								 *   EVERYONE NAME
								 *********************/}
								<tr>
									<td
										className="border rounded d-flex justify-content-between 
										mr-4 h-50px align-items-center">
										<b className="p-2 w-200px">Everyone</b>
										{store.students && (
											<b className="p-2">
												{store.students !== null
													? Math.ceil(
															store.students.reduce(
																(total, item, index) =>
																	store.students[index].attendance_log !== undefined
																		? total +
																		  store.students[index].attendance_log
																				.dailyAttendance
																		: 0,
																0
															) / store.students.length
													  )
													: 0}
												%
											</b>
										)}
									</td>
								</tr>
								{/************************
								 *   ALLS STUDENT NAMES
								 **************************/}
								{!store.students ? (
									<p>Loading students</p>
								) : store.students.length === 0 ? (
									<p>There are no students on this cohort.</p>
								) : (
									store.students.map((e, i) => (
										<tr key={i}>
											<td
												className="border rounded d-flex justify-content-between mr-4 h-50px
													align-items-center">
												<span className="p-2 w-200px">
													{e.user.first_name} {e.user.last_name}
												</span>
												<span className="p-2">
													{e.attendance_log !== undefined
														? Math.ceil(e.attendance_log.dailyAttendance)
														: "0"}
													%
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
						<div className="d-inline-block overflow">
							<table className="cell-spacing">
								<tbody>
									{/******************************
									 *   FIRST ROW DAYS IN COHORT
									 ********************************/}
									<tr className=" hover-gray">
										{new Array(daysInCohort).fill(null).map((e, i) => (
											<td key={i} className="h-50px">
												<Popover
													body={
														<div className="pop">
															<div>Day {i}</div>
														</div>
													}>
													{store.dailyAvg[`day${i}`] === undefined
														? noData
														: store.dailyAvg[`day${i}`] >= 85
															? thumbsUp
															: thumbsDown}
												</Popover>
											</td>
										))}
									</tr>
									{/*********************************
									 *   ALLS STUDENT DAYS IN COHORT
									 ***********************************/}
									{store.students.map((data, i) => (
										<tr key={i} className="hover-gray">
											{new Array(daysInCohort).fill(null).map((e, i) => {
												let d = data.attendance[`day${i}`]
													? data.attendance[`day${i}`].created_at.date
													: null;
												let date = "";
												if (d) {
													date = new Date(d);
													date = `${
														months[date.getMonth()]
													} ${date.getDate()}, ${date.getFullYear()}`;
												}
												return (
													<td key={i} className="h-50px">
														<Popover
															body={
																<div className="pop">
																	<div>Day {i}</div>
																	<div>{date}</div>
																</div>
															}>
															{!data.attendance[`day${i}`]
																? noData
																: data.attendance[`day${i}`].slug.includes(
																		"unattendance"
																  )
																	? thumbsDown
																	: thumbsUp}
														</Popover>
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)
			)}
		</div>
	);
};
