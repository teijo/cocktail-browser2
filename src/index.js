import React from "react";
import ReactDOM from "react-dom";

import recipes from "iba-cocktails-recipes"

const Recipes = ({recipes}) => (
    <ul>
      {recipes.map((r, i) => <li key={i}>{r.name}</li>)}
    </ul>
);

ReactDOM.render(<Recipes recipes={recipes}/>, document.getElementById("main"));
