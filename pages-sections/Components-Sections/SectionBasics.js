import React from "react";
// plugin that creates slider
import Slider from "nouislider";
// @material-ui/core components
import { makeStyles } from "@material-ui/core/styles";
import InputAdornment from "@material-ui/core/InputAdornment";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Radio from "@material-ui/core/Radio";
import Switch from "@material-ui/core/Switch";
// @material-ui/icons
import Favorite from "@material-ui/icons/Favorite";
import People from "@material-ui/icons/People";
import Check from "@material-ui/icons/Check";
import FiberManualRecord from "@material-ui/icons/FiberManualRecord";
// core components
import GridContainer from "components/Grid/GridContainer.js";
import GridItem from "components/Grid/GridItem.js";
import Button from "components/CustomButtons/Button.js";
import CustomInput from "components/CustomInput/CustomInput.js";
import CustomLinearProgress from "components/CustomLinearProgress/CustomLinearProgress.js";
import Paginations from "components/Pagination/Pagination.js";
import Badge from "components/Badge/Badge.js";

import styles from "assets/jss/nextjs-material-kit/pages/componentsSections/basicsStyle.js";

const useStyles = makeStyles(styles);

export default function SectionBasics() {
  const classes = useStyles();
  const [checked, setChecked] = React.useState([24, 22]);
  const [selectedEnabled, setSelectedEnabled] = React.useState("b");
  const [checkedA, setCheckedA] = React.useState(true);
  const [checkedB, setCheckedB] = React.useState(false);
  
  const handleToggle = value => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setChecked(newChecked);
  };
  return (
    <div className={classes.sections}>
      <div className={classes.container}>
        
        <div id="progress">
          <GridContainer>
            <GridItem xs={12} sm={12} md={6}>
              <div className={classes.title}>
                <h1>Conhecimentos</h1>
              </div>

              <div className={classes.title}>
                <h2>Escritório</h2>
              </div>

              <div className={classes.title}>
                <h4>Microsoft Access</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={60}
              />
              <div className={classes.title}>
                <h4>Microsoft Excel</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={90}
              />
              <div className={classes.title}>
                <h4>Microsoft PowerPoint</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={95}
              />
              <div className={classes.title}>
                <h4>Microsoft Windows</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={85}
              />
              <div className={classes.title}>
                <h4>Microsoft Word</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={90}
              />

              <div className={classes.title}>
                <h2>Audiovisual</h2>
              </div>

              <div className={classes.title}>
                <h4>Adobe After Effects</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={20}
              />
              <div className={classes.title}>
                <h4>Adobe Illustrator</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={60}
              />
              <div className={classes.title}>
                <h4>Adobe Lightroom</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={95}
              />
              <div className={classes.title}>
                <h4>Adobe Photoshop</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={90}
              />
              <div className={classes.title}>
                <h4>Adobe Premiere</h4>
              </div>
              <CustomLinearProgress
                variant="determinate"
                color="primary"
                value={60}
              />
                            
            </GridItem>
     
          </GridContainer>
        </div>

      </div>
    </div>
  );
}
