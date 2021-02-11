/*eslint-disable*/
import React from "react";
import Link from "next/link";

// @material-ui/core components
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Tooltip from "@material-ui/core/Tooltip";
import Icon from "@material-ui/core/Icon";

// @material-ui/icons
import { Apps, CloudDownload } from "@material-ui/icons";
import DeleteIcon from "@material-ui/icons/Delete";
import IconButton from "@material-ui/core/IconButton";

// core components
import CustomDropdown from "components/CustomDropdown/CustomDropdown.js";
import Button from "components/CustomButtons/Button.js";

import styles from "assets/jss/nextjs-material-kit/components/headerLinksStyle.js";

const useStyles = makeStyles(styles);

export default function HeaderLinks(props) {
  const classes = useStyles();
  return (
    <List className={classes.list}>
      
      <ListItem className={classes.listItem}>
        <Button
          href="https://ricardoelias.com.br"
          color="transparent"
          target="_self"
          className={classes.navLink}
        >
          <CloudDownload className={classes.icons} /> Home
        </Button>
      </ListItem>

      <ListItem className={classes.listItem}>
        <Button
          href="https://ricardoelias.com.br/sobre"
          color="transparent"
          target="_self"
          className={classes.navLink}
        >
          <CloudDownload className={classes.icons} /> Sobre
        </Button>
      </ListItem>

      <ListItem className={classes.listItem}>
        <Button
          href="https://ricardoelias.com.br/servicos"
          color="transparent"
          target="_self"
          className={classes.navLink}
        >
          <CloudDownload className={classes.icons} /> Serviços
        </Button>
      </ListItem>

      <ListItem className={classes.listItem}>
        <Button
          href="https://ricardoelias.com.br/depoimentos"
          color="transparent"
          target="_self"
          className={classes.navLink}
        >
          <CloudDownload className={classes.icons} /> Depoimentos
        </Button>
      </ListItem>

      <ListItem className={classes.listItem}>
        <Button
          href="https://ricardoelias.com.br/contato"
          color="transparent"
          target="_self"
          className={classes.navLink}
        >
          <CloudDownload className={classes.icons} /> Contato
        </Button>
      </ListItem>
      
      
    </List>
  );
}
