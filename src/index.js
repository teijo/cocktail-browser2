import Bacon from "baconjs";
import React from "react";
import ReactDOM from "react-dom";

import Recipes from "iba-cocktails-recipes"
import Ingredients from "iba-cocktails-ingredients"

require("./styles.less");

const extendedRecipes = Recipes.map(r => {
  r.extraVolume = r.ingredients.filter(ing => ing.unit === "cl").reduce((agg, ing) => agg + ing.amount, 0);
  r.extraBase = r.ingredients.filter(ing => Ingredients.hasOwnProperty(ing.ingredient) && Ingredients[ing.ingredient].abv > 0).sort((a, b) => a.amount > b.amount)[0].ingredient;
  return r;
});

const RecipeList = ({recipes}) => (
    <ul>
      {recipes.map((r, i) => <li key={i}>{r.name}</li>)}
    </ul>
);

const RadioSelect = ({name, checked, keyValues, onChange}) => (
    <form>
      {Object.keys(keyValues).map((key, i) => (
        <label key={i}>
          <input type="radio" name={name} value={key} onChange={onChange(key)} checked={checked === key}/>{keyValues[key]}
        </label>
      ))}
    </form>
);

const Filters = ({size, sizeOnChange, flavor, flavorOnChange, baseOptions, base, baseOnChange}) => (
    <nav>
      <RadioSelect name="size" checked={size} keyValues={{any: "Any", long: "Long", short: "Short"}} onChange={sizeOnChange}/>
      <RadioSelect name="flavor" checked={flavor} keyValues={{any: "Any", sour: "Sour", sweet: "Sweet", spiced: "Spiced"}} onChange={flavorOnChange}/>
      <form>
        <label>
          <select name="base" value={base} onChange={(e) => baseOnChange(e.target.value)()}>
            {baseOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
          </select>
          Base alcohol
        </label>
      </form>
    </nav>
);

const filterP = Bacon.combineTemplate({
  size: "any",
  flavor: "any",
  base: "Any"
});

const filterB = new Bacon.Bus();
const filterUpdatesP = filterB.toProperty((f) => f);
const updateFilter = (filter) => (value) => () => filterB.push((filters) => { filters[filter] = value; return filters; });

const Page = ({filters, recipes, baseOptions}) => (
  <div>
    <Filters
        size={filters.size}
        sizeOnChange={updateFilter("size")}
        flavor={filters.flavor}
        flavorOnChange={updateFilter("flavor")}
        base={filters.base}
        baseOptions={baseOptions}
        baseOnChange={updateFilter("base")}/>
    <RecipeList recipes={recipes}/>
  </div>
);

const applyBaseFilters = (filters, recipes) => (filters.base === "Any") ? recipes : recipes.filter(r => r.extraBase === filters.base);

const applySizeFilters = (filters, recipes) => {
  switch (filters.size) {
    case "any":
      return recipes;
    case "short":
      return recipes.filter(r => r.extraVolume <= 10);
    case "long":
      return recipes.filter(r => r.extraVolume > 10);
    default:
      throw new Error(`Unexpected filter size: ${filters.size}`);
  }
};

const applyFilters = (filters, recipes) => {
  return applySizeFilters(filters, recipes);
};

filterP
    .sampledBy(filterUpdatesP, (filters, filterModifier) => {
      const newFilters = filterModifier(filters);
      const activeRecipes = applyFilters(newFilters, extendedRecipes);

      const activeBaseIngredients = activeRecipes.reduce((acc, r) => {
        if (acc.indexOf(r.extraBase) === -1) {
          acc.push(r.extraBase);
        }
        return acc;
      }, []);

      const baseOptions = activeBaseIngredients.filter(k => Ingredients.hasOwnProperty(k) && Ingredients[k].abv > 0).sort();
      baseOptions.unshift("Any");

      return [newFilters, applyBaseFilters(newFilters, activeRecipes), baseOptions];
    })
    .onValues((filters, recipes, baseOptions) => ReactDOM.render(<Page filters={filters} recipes={recipes} baseOptions={baseOptions}/>, document.getElementById("main")));
