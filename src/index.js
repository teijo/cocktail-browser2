import Bacon from "baconjs";
import React from "react";
import ReactDOM from "react-dom";

import recipes from "iba-cocktails-recipes"
import ingredients from "iba-cocktails-ingredients"

const extendedRecipes = recipes.map(r => {
  r.extraVolume = r.ingredients.filter(ing => ing.unit === "cl").reduce((agg, ing) => agg + ing.amount, 0);
  r.extraBase = r.ingredients.filter(ing => ingredients.hasOwnProperty(ing.ingredient) && ingredients[ing.ingredient].abv > 0).sort((a, b) => a.amount > b.amount)[0].ingredient;
  return r;
});

const baseOptions = Object.keys(ingredients).filter(k => ingredients[k].abv > 0).sort();
baseOptions.unshift("Any");

const Recipes = ({recipes}) => (
    <ul>
      {recipes.map((r, i) => <li key={i}>{r.name}, {r.extraBase}</li>)}
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
          <select name="base" defaultValue={base} onChange={(e) => baseOnChange(e.target.value)()}>
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
  base: baseOptions[0]
});

const filterB = new Bacon.Bus();
const filterUpdatesP = filterB.toProperty((f) => f);
const updateFilter = (filter) => (value) => () => filterB.push((filters) => { filters[filter] = value; return filters; });

const Page = ({filters, recipes}) => (
  <div>
    <Filters
        size={filters.size}
        sizeOnChange={updateFilter("size")}
        flavor={filters.flavor}
        flavorOnChange={updateFilter("flavor")}
        base={filters.base}
        baseOptions={baseOptions}
        baseOnChange={updateFilter("base")}/>
    <Recipes recipes={recipes}/>
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
  return applySizeFilters(filters, applyBaseFilters(filters, recipes));
};

filterP
    .sampledBy(filterUpdatesP, (f, u) => {
      const newFilters = u(f);
      return [newFilters, applyFilters(newFilters, extendedRecipes)]
    })
    .onValues((filters, recipes) => ReactDOM.render(<Page filters={filters} recipes={recipes}/>, document.getElementById("main")));
