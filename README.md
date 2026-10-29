# Aero organization package

This folder holds the identity and source artwork for Aero. BRIEF.md records the decisions made so far, DESIGN_SYSTEM.md defines the visual rules, and REPOSITORIES.md maps the components.

Every image is generated. `scripts/flow.mjs` and `scripts/air.mjs` solve the airflow and dither it; `scripts/plates.mjs` composes the four plates and the mark; `scripts/export.mjs` writes the avatar, favicon, banners, social previews and the site's plates into their repositories. Run `npm install` and `npm run export` to regenerate them all.

`profile/README.md` is the organization profile shown at https://github.com/aero-devops. The website domain is still undecided, so the site is not linked yet.

The first launch is shell plus core working together on one host. The broader platform is a roadmap, not a claim about current capabilities.

