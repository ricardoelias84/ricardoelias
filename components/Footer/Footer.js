/*eslint-disable*/
import React from "react";
// nodejs library to set properties for components
import PropTypes from "prop-types";
// nodejs library that concatenates classes
import classNames from "classnames";
// material-ui core components
import { List, ListItem } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

// @material-ui/icons
import Favorite from "@material-ui/icons/Favorite";

import styles from "assets/jss/nextjs-material-kit/components/footerStyle.js";

const useStyles = makeStyles(styles);

export default function Footer(props) {
  const classes = useStyles();
  const { whiteFont } = props;
  const footerClasses = classNames({
    [classes.footer]: true,
    [classes.footerWhiteFont]: whiteFont
  });
  const aClasses = classNames({
    [classes.a]: true,
    [classes.footerWhiteFont]: whiteFont
  });
  return (
    <footer className={footerClasses}>
      <div className={classes.container}>
        <div className={classes.left}>
          <List className={classes.list}>
            <ListItem className={classes.inlineBlock}>
              <a
                href="https://ricardoelias.com.br"
                className={classes.block}
                target="_blank"
              >
                Ricardo Elias
              </a>
            </ListItem>
            <ListItem className={classes.inlineBlock}>
              <a
                href="https://ricardoelias.com.br/sobre"
                className={classes.block}
                target="_blank"
              >
                Sobre
              </a>
            </ListItem>
            <ListItem className={classes.inlineBlock}>
              <a
                href="https://ricardoelias.com.br/servicos"
                className={classes.block}
                target="_blank"
              >
                Serviços
              </a>
            </ListItem>
            <ListItem className={classes.inlineBlock}>
              <a
                href="https://ricardoelias.com.br/depoimentos"
                className={classes.block}
                target="_blank"
              >
                Depoimentos
              </a>
            </ListItem>
            <ListItem className={classes.inlineBlock}>
              <a
                href="https://ricardoelias.com.br/contato"
                className={classes.block}
                target="_blank"
              >
                Contato
              </a>
            </ListItem>
          </List>
        </div>

      </div>
    </footer>
  );
}

Footer.propTypes = {
  whiteFont: PropTypes.bool
};
