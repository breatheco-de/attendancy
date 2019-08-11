import React from "react";
import { PropTypes } from "prop-types";
import GreenThumb from "../../img/greenThumb.png";
import RedThumb from "../../img/redThumb.png";

const Student = props => {
	const obj = props.studentData;
	return (
		<div className="row mx-4 my-3 d-flex justify-content-between">
			<div className="col-3">
				<div>
					{obj.first_name} {obj.last_name}
				</div>
			</div>
			<div className="col">student assistance</div>
		</div>
	);
};

Student.propTypes = {
	studentData: PropTypes.object
};
export default Student;
