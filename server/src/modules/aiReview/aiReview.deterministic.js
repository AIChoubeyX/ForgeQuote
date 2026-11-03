import { calculateCost } from '../costing/costing.calculator.js';

export function validateCosting(context) {
  const findings = [];
  const { revision, part } = context;

  if (!revision) {
    findings.push({
      code: 'COSTING_DRAFT_NOT_SAVED',
      severity: 'critical',
      title: 'No Costing Revision Saved',
      message: 'No saved costing revision exists for this RFQ. Enter the costing inputs and save a draft before requesting AI review.',
      affectedRecord: 'costing_revisions',
      evidence: 'costingRevision is null for RFQ ' + (context.rfq?.rfqNumber || context.rfq?.id),
      recommendation: 'Save a draft costing revision to generate cost calculations.',
      source: 'deterministic'
    });
    return findings;
  }

  const inputs = revision.inputs || {};
  const mandatoryCodes = [
    { key: 'costingDate', name: 'Costing Date' },
    { key: 'materialRateCode', name: 'Material Rate Code' },
    { key: 'scrapRateCode', name: 'Scrap Rate Code' },
    { key: 'overheadRateCode', name: 'Overhead Rate Code' },
    { key: 'packingRateCode', name: 'Packing Rate Code' },
    { key: 'freightRateCode', name: 'Freight Rate Code' },
    { key: 'marginRateCode', name: 'Margin Rate Code' }
  ];

  for (const { key, name } of mandatoryCodes) {
    if (!inputs[key]) {
      findings.push({
        code: `COSTING_MISSING_${key.toUpperCase()}`,
        severity: 'critical',
        title: `Missing ${name}`,
        message: `Mandatory costing input "${name}" is not specified.`,
        affectedRecord: `inputs.${key}`,
        evidence: `inputs.${key} is missing or empty`,
        recommendation: `Provide a valid ${name.toLowerCase()} in the costing inputs.`,
        source: 'deterministic'
      });
    }
  }

  const weight = Number(inputs.materialWeight || part?.grossWeight);
  if (!weight || weight <= 0) {
    findings.push({
      code: 'COSTING_INVALID_WEIGHT',
      severity: 'critical',
      title: 'Invalid Material Weight',
      message: 'Material weight must be a positive number greater than 0.',
      affectedRecord: 'inputs.materialWeight',
      evidence: `Weight value: ${inputs.materialWeight}`,
      recommendation: 'Enter the part gross weight in kilograms.',
      source: 'deterministic'
    });
  }

  const operations = revision.operations || [];
  if (operations.length === 0) {
    findings.push({
      code: 'COSTING_NO_OPERATIONS',
      severity: 'critical',
      title: 'No Manufacturing Operations',
      message: 'Costing draft contains no manufacturing operations. Machine and labor costs cannot be calculated.',
      affectedRecord: 'operations',
      evidence: 'operations array is empty',
      recommendation: 'Add at least one manufacturing operation to the route.',
      source: 'deterministic'
    });
  } else {
    for (const op of operations) {
      if (!op.operationName?.trim()) {
        findings.push({
          code: 'COSTING_EMPTY_OPERATION_NAME',
          severity: 'critical',
          title: 'Operation Missing Name',
          message: `Operation at sequence ${op.sequence} is missing a descriptive name.`,
          affectedRecord: `operations[seq=${op.sequence}]`,
          evidence: `operationName is empty`,
          recommendation: 'Specify the machining or processing operation name.',
          source: 'deterministic'
        });
      }
      if (!op.machineCode?.trim()) {
        findings.push({
          code: 'COSTING_MISSING_MACHINE_CODE',
          severity: 'critical',
          title: 'Operation Missing Machine Code',
          message: `Operation at sequence ${op.sequence} ("${op.operationName || 'Unnamed'}") has no machine code assigned.`,
          affectedRecord: `operations[seq=${op.sequence}].machineCode`,
          evidence: `machineCode is empty`,
          recommendation: 'Assign a valid machine rate code from the rate master.',
          source: 'deterministic'
        });
      }
      if (!op.cycleTimeMinutes || op.cycleTimeMinutes <= 0) {
        findings.push({
          code: 'COSTING_INVALID_CYCLE_TIME',
          severity: 'critical',
          title: 'Invalid Cycle Time',
          message: `Operation at sequence ${op.sequence} has an invalid cycle time (${op.cycleTimeMinutes} min). Must be positive.`,
          affectedRecord: `operations[seq=${op.sequence}].cycleTimeMinutes`,
          evidence: `cycleTimeMinutes = ${op.cycleTimeMinutes}`,
          recommendation: 'Enter the estimated cycle time in minutes.',
          source: 'deterministic'
        });
      }
      if (op.rateValue === undefined || op.rateValue === null || op.rateValue <= 0) {
        findings.push({
          code: 'COSTING_UNRESOLVED_RATE',
          severity: 'critical',
          title: 'Unresolved Machine Rate',
          message: `Operation at sequence ${op.sequence} has no resolved active rate. Machine code "${op.machineCode}" may be inactive or missing on ${revision.costingDate}.`,
          affectedRecord: `operations[seq=${op.sequence}].rateValue`,
          evidence: `rateValue = ${op.rateValue}`,
          recommendation: 'Ensure the rate master has an active version for this machine code.',
          source: 'deterministic'
        });
      }
    }
  }

  // Arithmetic verification against calculation service
  if (revision.calculations?.components && inputs.rates) {
    try {
      const expected = calculateCost({
        materialRate: inputs.rates.materialRateCode?.value,
        scrapRate: inputs.rates.scrapRateCode?.value,
        overheadRate: inputs.rates.overheadRateCode?.value,
        packingRate: inputs.rates.packingRateCode?.value,
        freightRate: inputs.rates.freightRateCode?.value,
        marginRate: inputs.rates.marginRateCode?.value,
        materialWeight: weight,
        annualVolume: part?.annualVolume,
        operations: operations.map(o => ({
          sequence: o.sequence,
          operationName: o.operationName,
          machineCode: o.machineCode,
          cycleTimeMinutes: o.cycleTimeMinutes,
          rateValue: o.rateValue,
          rateUnit: o.rateUnit
        }))
      });

      const actualSelling = Number(revision.calculations.components.sellingPrice);
      const expectedSelling = Number(expected.components.sellingPrice);
      if (Math.abs(actualSelling - expectedSelling) > 0.05) {
        findings.push({
          code: 'COSTING_ARITHMETIC_MISMATCH',
          severity: 'critical',
          title: 'Cost Calculation Inconsistency',
          message: `Authoritative calculation discrepancy: stored selling price (${actualSelling}) does not match recalculated value (${expectedSelling}).`,
          affectedRecord: 'calculations.components.sellingPrice',
          evidence: `Stored: ${actualSelling}, Recalculated: ${expectedSelling}`,
          recommendation: 'Resave the costing draft to re-run deterministic costing formulas.',
          source: 'deterministic'
        });
      }
    } catch {
      // Rates might not be fully in memory; ignore recalculation failure if rates incomplete
    }
  }

  return findings;
}

export function validateRouting(context) {
  const findings = [];
  const { revision, part } = context;

  if (!revision) {
    findings.push({
      code: 'ROUTING_REVISION_NOT_FOUND',
      severity: 'critical',
      title: 'Routing Revision Not Found',
      message: 'No routing revision was provided for review.',
      affectedRecord: 'costing_revisions',
      evidence: 'revision is missing from context',
      recommendation: 'Select a submitted route from the routing review queue.',
      source: 'deterministic'
    });
    return findings;
  }

  const operations = revision.operations || [];

  if (operations.length === 0) {
    findings.push({
      code: 'ROUTING_NO_OPERATIONS',
      severity: 'critical',
      title: 'Route Has No Operations',
      message: 'The submitted manufacturing route contains zero operations. A route cannot be approved without operations.',
      affectedRecord: 'operations',
      evidence: 'operations count = 0',
      recommendation: 'Return route to the estimator to add required operations.',
      source: 'deterministic'
    });
    return findings;
  }

  // 1. Sequence number checks
  const sequenceMap = new Map();
  let prevSequence = 0;
  let hasOutOfOrder = false;

  for (const op of operations) {
    const seq = Number(op.sequence);
    if (!Number.isInteger(seq) || seq <= 0) {
      findings.push({
        code: 'ROUTING_INVALID_SEQUENCE',
        severity: 'critical',
        title: 'Invalid Sequence Number',
        message: `Operation "${op.operationName || 'Unnamed'}" has invalid sequence "${op.sequence}". Sequence must be a positive integer.`,
        affectedRecord: `operations[id=${op.id}]`,
        evidence: `sequence = ${op.sequence}`,
        recommendation: 'Re-sequence operations starting from 1 in ascending order.',
        source: 'deterministic'
      });
    }

    if (seq <= prevSequence) {
      hasOutOfOrder = true;
    }
    prevSequence = seq;

    if (!sequenceMap.has(seq)) {
      sequenceMap.set(seq, []);
    }
    sequenceMap.get(seq).push(op);
  }

  // Check duplicate sequences
  for (const [seq, ops] of sequenceMap.entries()) {
    if (ops.length > 1) {
      findings.push({
        code: 'ROUTING_DUPLICATE_SEQUENCE',
        severity: 'critical',
        title: 'Duplicate Sequence Number',
        message: `Sequence number ${seq} is assigned to ${ops.length} operations: ${ops.map(o => `"${o.operationName}"`).join(', ')}.`,
        affectedRecord: `operations.sequence=${seq}`,
        evidence: `Operations sharing sequence ${seq}: [${ops.map(o => o.id || o.operationName).join(', ')}]`,
        recommendation: 'Assign unique, ascending sequence numbers to each operation step.',
        source: 'deterministic'
      });
    }
  }

  if (hasOutOfOrder && !findings.some(f => f.code === 'ROUTING_DUPLICATE_SEQUENCE')) {
    findings.push({
      code: 'ROUTING_OUT_OF_ORDER_SEQUENCE',
      severity: 'warning',
      title: 'Out of Order Sequences',
      message: 'Operation sequence numbers are not in strictly ascending order.',
      affectedRecord: 'operations.sequence',
      evidence: `Sequence order: [${operations.map(o => o.sequence).join(', ')}]`,
      recommendation: 'Sort operations in sequential manufacturing workflow order.',
      source: 'deterministic'
    });
  }

  // 2. True duplicate operations check
  // Established domain rule: Two operations are duplicates if:
  // (a) they have the same sequence, OR
  // (b) they have the exact same operation name, machine code, and cycle time in the same route.
  // Note: Two operations with the same name but different sequences, different machine codes, or different cycle times are distinct steps (e.g. multiple turning passes, inspection steps).
  for (let i = 0; i < operations.length; i++) {
    for (let j = i + 1; j < operations.length; j++) {
      const opA = operations[i];
      const opB = operations[j];

      const sameName = opA.operationName?.trim().toLowerCase() === opB.operationName?.trim().toLowerCase();
      const sameMachine = opA.machineCode === opB.machineCode;
      const sameCycle = Math.abs(Number(opA.cycleTimeMinutes) - Number(opB.cycleTimeMinutes)) < 0.001;

      if (sameName && sameMachine && sameCycle) {
        findings.push({
          code: 'ROUTING_DUPLICATE_OPERATION',
          severity: 'warning',
          title: 'Duplicate Operation Detected',
          message: `Identical operation "${opA.operationName}" on machine "${opA.machineCode}" with cycle time ${opA.cycleTimeMinutes} min is repeated at sequence ${opA.sequence} and sequence ${opB.sequence}.`,
          affectedRecord: `operations[seq=${opA.sequence}] & operations[seq=${opB.sequence}]`,
          evidence: `Operation 1: Seq ${opA.sequence}, ${opA.operationName}, ${opA.machineCode}, ${opA.cycleTimeMinutes}m | Operation 2: Seq ${opB.sequence}, ${opB.operationName}, ${opB.machineCode}, ${opB.cycleTimeMinutes}m`,
          recommendation: 'Confirm whether this step is intentionally performed twice or is an accidental duplicate entry.',
          source: 'deterministic'
        });
      }
    }
  }

  // 3. Operation field completeness and rate verification
  for (const op of operations) {
    if (!op.operationName?.trim()) {
      findings.push({
        code: 'ROUTING_MISSING_OPERATION_NAME',
        severity: 'critical',
        title: 'Missing Operation Name',
        message: `Operation at sequence ${op.sequence} has no operation name.`,
        affectedRecord: `operations[seq=${op.sequence}].operationName`,
        evidence: `operationName is empty`,
        recommendation: 'Provide a descriptive manufacturing operation name.',
        source: 'deterministic'
      });
    }

    if (!op.machineCode?.trim()) {
      findings.push({
        code: 'ROUTING_MISSING_MACHINE_CODE',
        severity: 'critical',
        title: 'Missing Machine Code',
        message: `Operation "${op.operationName || op.sequence}" has no machine code assigned.`,
        affectedRecord: `operations[seq=${op.sequence}].machineCode`,
        evidence: `machineCode is empty`,
        recommendation: 'Select an authorized machine from the rate master.',
        source: 'deterministic'
      });
    }

    if (!op.cycleTimeMinutes || Number(op.cycleTimeMinutes) <= 0) {
      findings.push({
        code: 'ROUTING_INVALID_CYCLE_TIME',
        severity: 'critical',
        title: 'Invalid Cycle Time',
        message: `Operation "${op.operationName}" has an invalid cycle time (${op.cycleTimeMinutes} min). Must be positive.`,
        affectedRecord: `operations[seq=${op.sequence}].cycleTimeMinutes`,
        evidence: `cycleTimeMinutes = ${op.cycleTimeMinutes}`,
        recommendation: 'Enter a realistic positive cycle time in minutes.',
        source: 'deterministic'
      });
    } else if (Number(op.cycleTimeMinutes) > 180) {
      findings.push({
        code: 'ROUTING_HIGH_CYCLE_TIME',
        severity: 'info',
        title: 'High Cycle Time',
        message: `Cycle time of ${op.cycleTimeMinutes} minutes for "${op.operationName}" is unusually high (>3 hours per piece).`,
        affectedRecord: `operations[seq=${op.sequence}].cycleTimeMinutes`,
        evidence: `cycleTimeMinutes = ${op.cycleTimeMinutes}`,
        recommendation: 'Verify whether this cycle time is per-part or for a batch setup.',
        source: 'deterministic'
      });
    }

    // Machine rate check:
    // Important domain rule: In ForgeQuote, the machine rate (INR/hour) is an all-inclusive rate
    // covering both machine depreciation/power and operating labor.
    if (op.rateValue === undefined || op.rateValue === null || Number(op.rateValue) <= 0) {
      findings.push({
        code: 'ROUTING_MISSING_MACHINE_RATE',
        severity: 'critical',
        title: 'Missing Machine Rate',
        message: `Operation "${op.operationName}" on machine "${op.machineCode}" has no active rate ($0 or unresolved).`,
        affectedRecord: `operations[seq=${op.sequence}].rateValue`,
        evidence: `rateValue = ${op.rateValue}, rateUnit = ${op.rateUnit}`,
        recommendation: 'Configure an active rate master version for this machine code before approving.',
        source: 'deterministic'
      });
    }
  }

  return findings;
}

export function validateCommercial(context) {
  const findings = [];
  const { costingRevision, commercialReview, commercialConfig } = context;

  if (!costingRevision) {
    findings.push({
      code: 'COMMERCIAL_NO_COSTING_REVISION',
      severity: 'critical',
      title: 'Costing Revision Not Found',
      message: 'No costing revision is linked to this commercial review.',
      affectedRecord: 'costing_revisions',
      evidence: 'costingRevision is null',
      recommendation: 'Ensure commercial review is linked to a valid costing revision.',
      source: 'deterministic'
    });
    return findings;
  }

  // 1. Plant Head approval verification
  if (costingRevision.status !== 'approved') {
    findings.push({
      code: 'COMMERCIAL_PLANT_NOT_APPROVED',
      severity: 'critical',
      title: 'Costing Not Plant-Approved',
      message: `The underlying costing revision is currently "${costingRevision.status}". Commercial approval strictly requires plant-head route approval first.`,
      affectedRecord: 'costing_revisions.status',
      evidence: `Current costing revision status: ${costingRevision.status}`,
      recommendation: 'Wait for the plant head to approve the manufacturing route before granting commercial approval.',
      source: 'deterministic'
    });
  }

  // 2. Financial Breakdown checks
  const calculations = costingRevision.calculations || {};
  const components = calculations.components || {};

  const sellingPrice = Number(components.sellingPrice);
  const totalCost = Number(components.totalManufacturingCost);
  const margin = Number(components.margin);

  if (!sellingPrice || sellingPrice <= 0) {
    findings.push({
      code: 'COMMERCIAL_INVALID_SELLING_PRICE',
      severity: 'critical',
      title: 'Invalid Selling Price',
      message: 'Calculated selling price is zero or negative.',
      affectedRecord: 'calculations.components.sellingPrice',
      evidence: `sellingPrice = ${components.sellingPrice}`,
      recommendation: 'Check costing inputs and recalculate draft before commercial sign-off.',
      source: 'deterministic'
    });
  } else if (sellingPrice < totalCost) {
    findings.push({
      code: 'COMMERCIAL_SELLING_BELOW_COST',
      severity: 'critical',
      title: 'Selling Price Below Total Cost',
      message: `Selling price (${sellingPrice}) is less than total manufacturing cost (${totalCost}), indicating a negative margin.`,
      affectedRecord: 'calculations.components.sellingPrice',
      evidence: `sellingPrice: ${sellingPrice}, totalManufacturingCost: ${totalCost}`,
      recommendation: 'Adjust margin rate code to ensure profitable commercial pricing.',
      source: 'deterministic'
    });
  }

  if (totalCost > 0 && margin !== undefined) {
    const marginPct = (margin / totalCost) * 100;
    if (marginPct < 10) {
      findings.push({
        code: 'COMMERCIAL_LOW_MARGIN',
        severity: 'warning',
        title: 'Low Margin Threshold',
        message: `Proposed margin of ${marginPct.toFixed(1)}% is below the recommended 10% commercial threshold.`,
        affectedRecord: 'calculations.components.margin',
        evidence: `Margin: ${margin} (${marginPct.toFixed(1)}% of total cost ${totalCost})`,
        recommendation: 'Verify whether customer volume or contract terms justify sub-10% margins.',
        source: 'deterministic'
      });
    }
  }

  // 3. High-Value Threshold check
  const threshold = commercialConfig?.highValueThreshold || 100000;
  if (sellingPrice >= threshold) {
    findings.push({
      code: 'COMMERCIAL_HIGH_VALUE_THRESHOLD',
      severity: 'info',
      title: 'High-Value Commercial Item',
      message: `Part unit selling price (${sellingPrice}) meets or exceeds the high-value commercial threshold (${threshold}). Requires senior commercial sign-off.`,
      affectedRecord: 'calculations.components.sellingPrice',
      evidence: `sellingPrice = ${sellingPrice} >= threshold ${threshold}`,
      recommendation: 'Ensure required commercial delegation approvals are completed.',
      source: 'deterministic'
    });
  }

  // 4. Annual Volume Scenarios
  const scenarios = calculations.scenarios || [];
  if (scenarios.length === 0) {
    findings.push({
      code: 'COMMERCIAL_NO_SCENARIOS',
      severity: 'info',
      title: 'No Volume Scenarios',
      message: 'No annual volume scenario projections were calculated for this revision.',
      affectedRecord: 'calculations.scenarios',
      evidence: 'scenarios array is empty',
      recommendation: 'Verify annual volume assumptions with the customer.',
      source: 'deterministic'
    });
  }

  return findings;
}

