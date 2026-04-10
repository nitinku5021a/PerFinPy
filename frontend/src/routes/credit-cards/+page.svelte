<script>
  import { onMount } from "svelte";
  import { apiDelete, apiGet, apiPost, apiPut } from "$lib/api";
  import { formatInr } from "$lib/format";

  let loading = true;
  let error = "";
  let saveStatus = "";
  let creditCards = [];

  let newCardName = "";
  let newHolderName = "";
  let newCardDetails = "";
  let newFeaturesBenefits = "";
  let newAnnualFee = "";
  let newStatementDate = "";
  let newPaymentDate = "";

  function extractErrorMessage(err, fallback) {
    const raw = err?.message || "";
    try {
      const parsed = JSON.parse(raw);
      return parsed?.error || fallback;
    } catch {
      return raw || fallback;
    }
  }

  async function load() {
    loading = true;
    error = "";
    saveStatus = "";
    try {
      const payload = await apiGet("/credit-cards");
      creditCards = (payload?.credit_cards || []).map(prepareCardState);
    } catch (err) {
      error = extractErrorMessage(err, "Failed to load credit cards.");
    } finally {
      loading = false;
    }
  }

  function prepareCardState(card) {
    return {
      ...card,
      isEditing: false,
      draft: {
        card_name: card.card_name || "",
        holder_name: card.holder_name || "",
        card_details: card.card_details || "",
        features_benefits: card.features_benefits || "",
        annual_fee: card.annual_fee == null ? "" : String(card.annual_fee),
        statement_date: card.statement_date == null ? "" : String(card.statement_date),
        payment_date: card.payment_date == null ? "" : String(card.payment_date)
      }
    };
  }

  function formatMoney(value) {
    if (value == null || value === "") return "Not set";
    return `INR ${formatInr(Number(value || 0))}`;
  }

  function formatDay(value) {
    if (value == null || value === "") return "Not set";
    const day = Number(value);
    const mod10 = day % 10;
    const mod100 = day % 100;
    let suffix = "th";
    if (mod10 === 1 && mod100 !== 11) suffix = "st";
    if (mod10 === 2 && mod100 !== 12) suffix = "nd";
    if (mod10 === 3 && mod100 !== 13) suffix = "rd";
    return `${day}${suffix}`;
  }

  function startEditing(card) {
    card.draft = {
      card_name: card.card_name || "",
      holder_name: card.holder_name || "",
      card_details: card.card_details || "",
      features_benefits: card.features_benefits || "",
      annual_fee: card.annual_fee == null ? "" : String(card.annual_fee),
      statement_date: card.statement_date == null ? "" : String(card.statement_date),
      payment_date: card.payment_date == null ? "" : String(card.payment_date)
    };
    card.isEditing = true;
  }

  function cancelEditing(card) {
    card.isEditing = false;
    card.draft = {
      card_name: card.card_name || "",
      holder_name: card.holder_name || "",
      card_details: card.card_details || "",
      features_benefits: card.features_benefits || "",
      annual_fee: card.annual_fee == null ? "" : String(card.annual_fee),
      statement_date: card.statement_date == null ? "" : String(card.statement_date),
      payment_date: card.payment_date == null ? "" : String(card.payment_date)
    };
  }

  async function createCreditCard() {
    error = "";
    saveStatus = "";
    try {
      await apiPost("/credit-cards", {
        card_name: newCardName,
        holder_name: newHolderName,
        card_details: newCardDetails,
        features_benefits: newFeaturesBenefits,
        annual_fee: newAnnualFee === "" ? null : Number(newAnnualFee),
        statement_date: newStatementDate === "" ? null : Number(newStatementDate),
        payment_date: newPaymentDate === "" ? null : Number(newPaymentDate)
      });
      newCardName = "";
      newHolderName = "";
      newCardDetails = "";
      newFeaturesBenefits = "";
      newAnnualFee = "";
      newStatementDate = "";
      newPaymentDate = "";
      saveStatus = "Credit card added.";
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to create credit card.");
    }
  }

  async function updateCreditCard(card) {
    error = "";
    saveStatus = "";
    try {
      await apiPut(`/credit-cards/${card.id}`, {
        card_name: card.draft.card_name,
        holder_name: card.draft.holder_name,
        card_details: card.draft.card_details,
        features_benefits: card.draft.features_benefits,
        annual_fee: card.draft.annual_fee === "" || card.draft.annual_fee == null ? null : Number(card.draft.annual_fee),
        statement_date: card.draft.statement_date === "" || card.draft.statement_date == null ? null : Number(card.draft.statement_date),
        payment_date: card.draft.payment_date === "" || card.draft.payment_date == null ? null : Number(card.draft.payment_date)
      });
      saveStatus = "Credit card updated.";
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to update credit card.");
    }
  }

  async function deleteCreditCard(card) {
    error = "";
    const ok = window.confirm(`Delete credit card "${card.card_name}" for ${card.holder_name}?`);
    if (!ok) return;

    try {
      await apiDelete(`/credit-cards/${card.id}`);
      saveStatus = "Credit card deleted.";
      await load();
    } catch (err) {
      error = extractErrorMessage(err, "Failed to delete credit card.");
    }
  }

  onMount(load);
</script>

<h1 class="page-title">Credit Cards</h1>
<p class="page-subtitle">
  Track each card, cardholder, annual fee, statement day, payment day, and the notes you want preserved in Excel import/export.
</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="credit-card-create">
    <div class="credit-card-form">
      <label>
        Card Name
        <input type="text" bind:value={newCardName} placeholder="HDFC Millennia" />
      </label>
      <label>
        Holder Name
        <input type="text" bind:value={newHolderName} placeholder="Guchi" />
      </label>
      <label>
        Annual Fee
        <input type="number" min="0" step="0.01" bind:value={newAnnualFee} placeholder="999" />
      </label>
      <label>
        Statement Date
        <input type="number" min="1" max="31" bind:value={newStatementDate} placeholder="12" />
      </label>
      <label>
        Payment Date
        <input type="number" min="1" max="31" bind:value={newPaymentDate} placeholder="27" />
      </label>
      <label class="credit-card-form__wide">
        Card Details
        <textarea rows="2" bind:value={newCardDetails} placeholder="Network, last 4 digits, bank, limit, login notes"></textarea>
      </label>
      <label class="credit-card-form__wide">
        Features and Benefits
        <textarea rows="2" bind:value={newFeaturesBenefits} placeholder="Cashback, lounge access, milestone rewards"></textarea>
      </label>
      <div class="toolbar credit-card-form__actions">
        <button class="button credit-card-button credit-card-button--primary" on:click={createCreditCard}>Add Credit Card</button>
      </div>
      <div class="toolbar credit-card-form__actions">
      {#if saveStatus}
        <span class="meta">{saveStatus}</span>
      {/if}
      </div>
    </div>
  </div>
</div>

{#if loading}
  <p class="meta">Loading...</p>
{:else}
  <div class="credit-card-grid">
    {#if creditCards.length === 0}
      <div class="credit-card-empty">
        <h3>No credit cards added yet</h3>
        <p>Add your first card above and it will also be included in Excel export/import.</p>
      </div>
    {/if}

    {#each creditCards as card}
      <section class="credit-card-tile">
        <div class="credit-card-tile__top">
          <div>
            <p class="credit-card-tile__eyebrow">Credit Card</p>
            <h2 class="credit-card-tile__name">{card.card_name}</h2>
            <p class="credit-card-tile__holder">{card.holder_name}</p>
          </div>
          <div class="credit-card-tile__actions">
            {#if card.isEditing}
              <button class="button credit-card-button credit-card-button--primary" on:click={() => updateCreditCard(card)}>Save</button>
              <button class="button credit-card-button" on:click={() => cancelEditing(card)}>Cancel</button>
            {:else}
              <button class="button credit-card-button credit-card-button--primary" on:click={() => startEditing(card)}>Edit</button>
            {/if}
            <button class="button credit-card-button credit-card-button--danger" on:click={() => deleteCreditCard(card)}>Delete</button>
          </div>
        </div>

        <div class="credit-card-metrics">
          <div class="credit-card-metric">
            <span>Annual Fee</span>
            <strong>{formatMoney(card.isEditing ? card.draft.annual_fee : card.annual_fee)}</strong>
          </div>
          <div class="credit-card-metric">
            <span>Statement Date</span>
            <strong>{formatDay(card.isEditing ? card.draft.statement_date : card.statement_date)}</strong>
          </div>
          <div class="credit-card-metric">
            <span>Payment Date</span>
            <strong>{formatDay(card.isEditing ? card.draft.payment_date : card.payment_date)}</strong>
          </div>
        </div>

        {#if card.isEditing}
          <div class="credit-card-edit-grid">
            <label>
              Card Name
              <input type="text" bind:value={card.draft.card_name} />
            </label>
            <label>
              Holder Name
              <input type="text" bind:value={card.draft.holder_name} />
            </label>
            <label>
              Annual Fee
              <input type="number" min="0" step="0.01" bind:value={card.draft.annual_fee} />
            </label>
            <label>
              Statement Date
              <input type="number" min="1" max="31" bind:value={card.draft.statement_date} />
            </label>
            <label>
              Payment Date
              <input type="number" min="1" max="31" bind:value={card.draft.payment_date} />
            </label>
            <label class="credit-card-edit-grid__wide">
              Card Details
              <textarea rows="3" bind:value={card.draft.card_details}></textarea>
            </label>
            <label class="credit-card-edit-grid__wide">
              Features and Benefits
              <textarea rows="3" bind:value={card.draft.features_benefits}></textarea>
            </label>
          </div>
        {:else}
          <div class="credit-card-sections">
            <div class="credit-card-section">
              <span>Card Details</span>
              <p>{card.card_details || "No card details added yet."}</p>
            </div>
            <div class="credit-card-section">
              <span>Features and Benefits</span>
              <p>{card.features_benefits || "No features or benefits added yet."}</p>
            </div>
          </div>
        {/if}
      </section>
    {/each}
  </div>
{/if}

<style>
  .credit-card-create {
    padding: 8px 4px;
  }

  .credit-card-tile__eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1d4ed8;
  }

  .credit-card-form {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .credit-card-form label {
    display: grid;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
  }

  .credit-card-form input,
  .credit-card-form textarea,
  .credit-card-edit-grid input,
  .credit-card-edit-grid textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #ffffff;
    color: var(--text);
    padding: 10px 12px;
    font: inherit;
  }

  .credit-card-form textarea,
  .credit-card-edit-grid textarea {
    resize: vertical;
    min-height: 76px;
  }

  .credit-card-form__wide {
    grid-column: span 2;
  }

  .credit-card-form__actions {
    grid-column: 1 / -1;
    margin-bottom: 0;
  }

  .credit-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 14px;
  }

  .credit-card-empty,
  .credit-card-tile {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
  }

  .credit-card-empty {
    padding: 22px;
    color: var(--muted);
  }

  .credit-card-empty h3 {
    color: var(--text);
    margin-bottom: 6px;
  }

  .credit-card-tile {
    padding: 18px;
    background:
      radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 30%),
      linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
  }

  .credit-card-tile__top {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .credit-card-tile__name {
    margin-top: 6px;
    font-size: 22px;
    line-height: 1.2;
  }

  .credit-card-tile__holder {
    margin-top: 6px;
    color: var(--muted);
    font-size: 14px;
  }

  .credit-card-tile__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .credit-card-button {
    border-radius: 999px;
    padding: 7px 12px;
  }

  .credit-card-button--primary {
    border-color: #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .credit-card-button--danger {
    border-color: #fecaca;
    background: #fff1f2;
    color: #b42318;
  }

  .credit-card-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .credit-card-metric {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid #e5eefb;
  }

  .credit-card-metric span,
  .credit-card-section span,
  .credit-card-edit-grid label {
    color: var(--muted);
    font-size: 12px;
  }

  .credit-card-metric strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
    line-height: 1.2;
  }

  .credit-card-sections,
  .credit-card-edit-grid {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }

  .credit-card-section {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid #e5e7eb;
  }

  .credit-card-section p {
    margin-top: 8px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .credit-card-edit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .credit-card-edit-grid label {
    display: grid;
    gap: 6px;
  }

  .credit-card-edit-grid__wide {
    grid-column: span 2;
  }

  @media (max-width: 900px) {
    .credit-card-form {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .credit-card-form__wide {
      grid-column: span 2;
    }
  }

  @media (max-width: 640px) {
    .credit-card-form {
      grid-template-columns: 1fr;
    }

    .credit-card-form__wide {
      grid-column: auto;
    }

    .credit-card-metrics,
    .credit-card-edit-grid {
      grid-template-columns: 1fr;
    }

    .credit-card-edit-grid__wide {
      grid-column: auto;
    }

    .credit-card-tile__top {
      flex-direction: column;
    }

    .credit-card-tile__actions {
      justify-content: flex-start;
    }
  }
</style>
