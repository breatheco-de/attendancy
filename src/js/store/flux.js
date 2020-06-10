import PropTypes from "prop-types";

const ASSETS_URL = process.env.ASSETS_URL + "/apis";
const API_URL = process.env.API_URL;

const params = new URLSearchParams(location.search);
const assets_token = params.get("assets_token");
const access_token = params.get("bc_token");
console.log("Some ", { assets_token, access_token });

const getState = ({ getStore, setStore, getActions }) => {
	return {
		store: {
			cohorts: [],
			current: null,
			students: null,
			dailyAvg: {},
			totalAvg: null
		},
		actions: {
			getTokensFromURL: props => {
				const initialCohort = params.get("cohort_slug");
				const { cohorts } = getStore();
				if (initialCohort) {
					getActions("getStudentsAndActivities")({
						cohort: cohorts.find(c => c.slug === initialCohort),
						props
					});
				}
			},
			getStudentsAndActivities: ({ cohort, props }) => {
				const cohortSlug = cohort.slug;
				setStore({ students: null, dailyAvg: null, current: cohort });
				let url = `${API_URL}/students/cohort/${cohortSlug}?access_token=${access_token}`;

				// Fetch students from cohort
				fetch(url, { cache: "no-cache" })
					.then(response => {
						if (!response.ok) {
							props.history.push("/?error=renew_access_token");
							throw Error;
						}
						return response.json();
					})
					.then(({ data: students }) => {
						getActions("formatNames")(students);
						// Fetch all activities from cohort
						const _activities = ["classroom_attendance", "classroom_unattendance"];
						url = `${ASSETS_URL}/activity/cohort/${cohortSlug}?activities=${_activities.join(
							","
						)}&access_token=${assets_token}`;
						fetch(url, { cache: "no-cache" })
							.then(response => {
								if (!response.ok) {
									response.json().then(error => {
										throw Error(error.msg || "Error fetching activities");
									});
								} else {
									return response.json();
								}
							})
							.then(activities => {
								// Merge students with their activities
								let student = {};
								let stuAct = {}; // {student_id: {day0: unattendance, day1: attendance, ...}}
								let dailyAvg = {}; // {day0: 89%, day1: 61%, ...}
								//
								activities.log.filter(item => item.slug.includes("attendance")).forEach(element => {
									let days = JSON.parse(element.data).day;
									if (student[element.user_id] === undefined) {
										student[element.user_id] = {};
										student[element.user_id].student_id = element.user_id;
										student[element.user_id].attendance = 0;
										student[element.user_id].unattendance = 0;
										student[element.user_id].days = [];
										student[element.user_id].totalAttendance = 0;
										student[element.user_id].dailyAttendance = 0;
									}

									if (!student[element.user_id].days.includes(days)) {
										student[element.user_id].attendance += element.slug.includes("attendance")
											? 1
											: 0;
										student[element.user_id].unattendance += element.slug.includes("unattendance")
											? 1
											: 0;
										student[element.user_id].days.push(days);
										student[element.user_id].totalAttendance =
											(student[element.user_id].days.length * 100) / 45;
										student[element.user_id].dailyAttendance =
											(student[element.user_id].attendance * 100) /
											(student[element.user_id].attendance +
												student[element.user_id].unattendance);
										dailyAvg[day] += element.slug.includes("unattendance") ? 0 : 1;
									}

									let day = `day${JSON.parse(element.data).day}`;
									// Create temp obj to store all activities by student id
									if (stuAct[element.user_id] === undefined) {
										stuAct[element.user_id] = {};
										stuAct[element.user_id].avg = 0;
									}
									if (dailyAvg[day] === undefined) {
										dailyAvg[day] = 0;
									}
									// Inside also store all the activities by creating a day property
									stuAct[element.user_id][day] = element;
									stuAct[element.user_id].avg += element.slug.includes("unattendance") ? 0 : 1;
									dailyAvg[day] += element.slug.includes("unattendance") ? 0 : 1;
								});
								// Add cohort assistance into students array

								for (let singleStudent in student) {
									students.forEach(item => {
										if (item.attendance_log === undefined) {
											item.attendance_log = {};
											item.attendance_log.totalAttendance = 0;
											(item.attendance_log.dailyAttendance = 0),
												(item.attendance_log.attendance = 0);
											item.attendance_log.unattendance = 0;
											item.attendance_log.days = [];
										}
										if (item.id == singleStudent) {
											item.attendance_log = student[singleStudent];
										}
									});
								}
								// divide by the number of students to get the avg
								Object.keys(dailyAvg).map(
									key => (dailyAvg[key] = (dailyAvg[key] / students.length) * 100)
								);
								// divide by the amount of days recorded to get the avg
								Object.keys(stuAct).map(
									key =>
										(stuAct[key].avg =
											(stuAct[key].avg / (Object.keys(stuAct[key]).length - 1)) * 100) // Minus the avg key
								);
								students.forEach(e => (e.attendance = stuAct[e.id] ? stuAct[e.id] : []));
								setStore({ students, dailyAvg });
							});

						props.history.push(
							`/?cohort_slug=${cohortSlug}&bc_token=${access_token}&assets_token=${assets_token}`
						);
					});
			},
			formatNames: data => {
				const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
				const getUserName = email => email.substring(0, email.indexOf("@")).toLowerCase();
				const fullTrim = str => {
					let newStr = "";
					str = str.trim();
					for (let i in str) if (str[i] !== " " || str[i - 1] !== " ") newStr += str[i];
					return newStr;
				};

				for (let i in data) {
					let first = data[i].first_name;
					let last = data[i].last_name;
					if (last === null) last = "";
					// In the fetch url, Students have email, Users have username
					let username =
						data[i].username === undefined ? getUserName(data[i].email) : getUserName(data[i].username);
					// first_name: null
					// first_name: "null null"
					if (first === null || first.includes("null")) {
						first = username;
					}
					// first === email username, keep lowercase
					else if (first.toLowerCase() === username && last === "") {
						first = username;
					} else {
						first = fullTrim(first);
						last = fullTrim(last);
						let arr = first.split(" ");
						// first_name: "John"
						// first_name: "JohnDoe"
						// first_name: "JOHNDOE"
						if (arr.length === 1) {
							if (first !== first.toLowerCase() && first !== first.toUpperCase()) {
								let temp = "";
								for (let char of first) {
									if (char === char.toUpperCase() && isNaN(char)) temp += " " + char;
									else temp += char;
								}
								first = temp.trim();
								arr = first.split(" ");
								if (arr.length === 1) first = capitalize(arr[0]);
							} else first = capitalize(first);
						}
						// first_name: "john doe", last_name: ""
						if (arr.length === 2 && last === "") {
							first = capitalize(arr[0]);
							last = capitalize(arr[1]);
						}
						// first_name: "john joe doe", last_name: ""
						else if (arr.length === 3 && last === "") {
							first = capitalize(arr[0]) + " " + capitalize(arr[1]);
							last = capitalize(arr[2]);
						}
						// first_name: "john billy", last_name: "joe doe"
						else if (last !== "") {
							let arrl = last.split(" ");
							for (let i in arr) arr[i] = capitalize(arr[i]);
							for (let i in arrl) arrl[i] = capitalize(arrl[i]);
							first = arr.join(" ");
							last = arrl.join(" ");
						}
					}
					data[i].first_name = first;
					data[i].last_name = last;
				}
			},
			getCohorts: () =>
				new Promise((resolve, reject) => {
					const url = `${process.env.API_URL}/cohorts/?access_token=${access_token}`;
					fetch(url, { cache: "no-cache" })
						.then(response => {
							return response.json();
						})
						.then(data => {
							setStore({ cohorts: data.data.sort((a, b) => (a.name > b.name ? 1 : -1)) });
							resolve(data);
						})
						.catch(error => {
							reject(error);
						});
				})
		}
	};
};

getState.propTypes = {
	history: PropTypes.object
};

export default getState;
