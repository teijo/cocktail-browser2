import Bacon from "baconjs";
import React from "react";
import ReactDOM from "react-dom";

import Recipes from "iba-cocktails-recipes"
import Ingredients from "iba-cocktails-ingredients"

require("./styles.less");

const weightedTaste = (r) => {
  const tastes = r.ingredients
      .filter(ing => Ingredients.hasOwnProperty(ing.ingredient) && Ingredients[ing.ingredient].taste !== null)
      .reduce((acc, ing) => {
        const taste = Ingredients[ing.ingredient].taste;
        if (!acc.hasOwnProperty(taste)) {
          acc[taste] = 0;
        }
        acc[taste] += ing.amount;
        return acc;
      }, {});
  const dominantTaste = Object.keys(tastes).reduce((acc, t) => {
    return tastes[t] > acc.amount ? {taste: t, amount: tastes[t]} : acc;
  }, {taste: null, amount: 0});
  return dominantTaste.taste;
};

const extendedRecipes = Recipes.map(r => {
  r.ingredients = r.ingredients.sort((a, b) => a.amount < b.amount ? 1 : -1);
  r.extraVolume = r.ingredients.filter(ing => ing.unit === "cl").reduce((agg, ing) => agg + ing.amount, 0);
  r.extraBase = r.ingredients.filter(ing => Ingredients.hasOwnProperty(ing.ingredient) && Ingredients[ing.ingredient].abv > 0).sort((a, b) => a.amount > b.amount ? -1 : 1)[0].ingredient;
  r.extraTaste = weightedTaste(r);
  return r;
});

const RecipeItem = React.createClass({
  getInitialState() {
    return {
      focus: false
    }
  },
  toggleFocus() {
    this.setState({focus: !this.state.focus});
  },
  render() {
    const r = this.props.recipe;
    const element = !this.state.focus ? (
        <ul className="summary">
          {r.ingredients.filter(ing => ing.hasOwnProperty("ingredient")).map((ing, i) => <li key={i}>{ing.label || ing.ingredient}</li>)}
          <li>
            {r.ingredients
                .filter(ing => ing.hasOwnProperty("ingredient"))
                .reduce((acc, ing) => {
                  acc.push(ing.amount);
                  return acc;
                }, [])
                .join(" : ")}
          </li>
        </ul>
    ) : (
        <div className="details">
          <p>Ingredients:</p>
          <ul>
            {r.ingredients.map((ing, i) => (
                <li key={i}>
                  <span className="amount">{ing.unit === "cl" ? `${ing.amount} ${ing.unit}` : null}</span>
                  <span>{ing.special || ing.label || ing.ingredient}</span>
                </li>
            ))}
          </ul>
          {r.glass ? <p>{`Glass: ${r.glass}`}</p> : null}
          <p>{`Preparation: ${r.preparation}`}</p>
          {r.garnish ? <p>Garnish: {r.garnish}</p> : null}
        </div>
    );

    return (
        <li className={this.state.focus ? "open" : null} onClick={this.toggleFocus}><h2>{r.name}</h2>
          {element}
        </li>
    );
  }
});

const RecipeList = ({recipes}) => (
    <ul id="recipeList">
      {recipes.map((r, i) => <RecipeItem key={r.name} recipe={r}/>)}
    </ul>
);

const RadioSelect = ({title, name, checked, keyValues, onChange}) => (
    <form>
      <p>{title}</p>
      <div className="inputGroup">
      {Object.keys(keyValues).map((key, i) => (
        <label key={i}>
          <input type="radio" name={name} value={key} onChange={onChange(key)} checked={checked === key}/>{keyValues[key]}
        </label>
      ))}
      </div>
    </form>
);

const DropdownSelect = ({title, options, selected, onChange}) => (
    <form>
      <p>{title}</p>
      <select name="base" value={selected} onChange={onChange}>
        {Object.keys(options).map((k, i) => <option key={i} value={k}>{options[k]}</option>)}
      </select>
    </form>
);

const Filters = ({size, sizeOnChange, taste, tasteOnChange, baseOptions, base, baseOnChange}) => (
    <nav>
      <RadioSelect title="Size" name="size" checked={size} keyValues={{any: "Any", long: "Long", short: "Short"}} onChange={sizeOnChange}/>
      <RadioSelect title="Taste" name="taste" checked={taste} keyValues={{any: "Any", sour: "Sour", sweet: "Sweet", bitter: "Bitter", salty: "Salty"}} onChange={tasteOnChange}/>
      <DropdownSelect title="Primary alcohol" options={baseOptions} selected={base} onChange={(e) => baseOnChange(e.target.value)()}/>
    </nav>
);

const filterP = Bacon.combineTemplate({
  size: "any",
  taste: "any",
  base: "Any"
});

const filterB = new Bacon.Bus();
const filterUpdatesP = filterB.toProperty((f) => f);
const updateFilter = (filter) => (value) => () => filterB.push((filters) => { filters[filter] = value; return filters; });

const Page = ({filters, recipes, baseOptions}) => (
  <div>
    <h1>Cocktail Browser</h1>
    <Filters
        size={filters.size}
        sizeOnChange={updateFilter("size")}
        taste={filters.taste}
        tasteOnChange={updateFilter("taste")}
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

const applyTasteFilters = (filters, recipes) => {
  return (filters.taste === "any") ? recipes : recipes.filter(r => r.extraTaste === filters.taste);
};

const applyFilters = (filters, recipes) => {
  return applySizeFilters(filters, applyTasteFilters(filters, recipes));
};

filterP
    .sampledBy(filterUpdatesP, (filters, filterModifier) => {
      const newFilters = filterModifier(filters);
      const activeRecipes = applyFilters(newFilters, extendedRecipes);

      const activeBaseIngredients = activeRecipes.reduce((acc, r) => {
        if (!acc.hasOwnProperty(r.extraBase)) {
          acc[r.extraBase] = 0;
        }
        acc[r.extraBase]++;
        return acc;
      }, {"Any": activeRecipes.length});

      const filteredRecipes = applyBaseFilters(newFilters, activeRecipes);

      const baseOptions = Object.keys(activeBaseIngredients).filter(k => Ingredients.hasOwnProperty(k) && Ingredients[k].abv > 0).sort();
      if (filteredRecipes.length === 0) {
        // Filtering caused zero results but we want to show it in the list as selected
        baseOptions.unshift(newFilters.base);
      }
      baseOptions.unshift("Any");

      return [newFilters, filteredRecipes.sort((a, b) => a.name > b.name ? 1 : -1), baseOptions.reduce((acc, b) => {
        acc[b] = `${b} (${activeBaseIngredients[b] || 0})`;
        return acc;
      }, {})];
    })
    .onValues((filters, recipes, baseOptions) => ReactDOM.render(<Page filters={filters} recipes={recipes} baseOptions={baseOptions}/>, document.getElementById("main")));
