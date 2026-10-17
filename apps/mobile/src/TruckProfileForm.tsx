import React, {useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ActionButton as Button} from './ActionButton';
import {colors} from './theme';
import {ProfileInput, type ProfileInputProps} from './ProfileInput';
import {parseTruckProfile, feetToMeters, inchesToMeters, poundsToKilograms, feetAndInchesToMeters,
  type TruckProfile, type VehicleType} from '@truck/truck-profile';
import {type TruckProfileStore} from './storage/TruckProfileStore';
import {ProfilePersistence} from './ProfilePersistence';

const fields = [
  ['name', 'Profile name'],
  ['overallHeightMeters', 'Overall height (m)'],
  ['overallWidthMeters', 'Overall width (m)'],
  ['overallLengthMeters', 'Overall length (m)'],
  ['currentGrossMassKilograms', 'Current gross mass (kg)'],
  ['totalAxleCount', 'Total physical axles'],
] as const;
type Field = typeof fields[number][0];
const empty: Record<Field, string> = {
  name: '', overallHeightMeters: '', overallWidthMeters: '', overallLengthMeters: '',
  currentGrossMassKilograms: '', totalAxleCount: '',
};
const modes = ['m/kg', 'ft/lb', 'in/lb', 'ft+in/lb'] as const;
type Mode = typeof modes[number];
const emptyInches = {overallHeightMeters: '', overallWidthMeters: '', overallLengthMeters: ''};
type Dimension = keyof typeof emptyInches;
function isDimension(field: Field): field is Dimension {return Object.hasOwn(emptyInches, field);}

function DraftInput({initialValue, ...props}: Omit<ProfileInputProps, 'defaultValue'> & {initialValue: string}) {
  // Seed once per editing session. Never echo delayed JS text over native typing.
  // The parent remounts inputs only on unit changes and explicit Restore.
  const [seed] = useState(initialValue);
  return <ProfileInput {...props} defaultValue={seed} />;
}

export function TruckProfileForm({store, onInputFocus}: {store?: TruckProfileStore; onInputFocus?: (windowY: number) => void}) {
  const [storageBusy, setStorageBusy] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>();
  const [mode, setMode] = useState<Mode>('m/kg');
  const drafts = useRef<Record<Mode, Record<Field, string>>>({
    'm/kg': {...empty}, 'ft/lb': {...empty}, 'in/lb': {...empty}, 'ft+in/lb': {...empty},
  });
  const inches = useRef({...emptyInches});
  const [restoreRevision, setRestoreRevision] = useState(0);
  const values = drafts.current[mode];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState<TruckProfile>();
  function validate() {
    const axles = values.totalAxleCount.trim();
    const converted = {...values};
    const conversionErrors: Record<string, string> = {};
    if (mode !== 'm/kg') {
      for (const field of ['overallHeightMeters', 'overallWidthMeters', 'overallLengthMeters',
        'currentGrossMassKilograms'] as const) {
        const result = field === 'currentGrossMassKilograms' ? poundsToKilograms(values[field]) :
          mode === 'ft+in/lb' ? feetAndInchesToMeters(values[field], inches.current[field]) :
            mode === 'ft/lb' ? feetToMeters(values[field]) : inchesToMeters(values[field]);
        if (result.ok) {converted[field] = result.value;}
        else {
          conversionErrors[field] = mode === 'ft+in/lb' && field !== 'currentGrossMassKilograms' ?
            'Enter whole feet and inches from 0 to below 12; total must be positive.' :
            'Enter a positive decimal using a dot.';
          converted[field] = ''; // A failed conversion must never be interpreted as SI input.
        }
      }
    }
    const result = parseTruckProfile({schemaVersion: 1, vehicleType, ...converted,
      totalAxleCount: /^\d+$/.test(axles) ? Number(axles) : undefined});
    if (result.ok) {
      setErrors({}); setValidated(result.value);
    } else {
      const next: Record<string, string> = {...conversionErrors};
      for (const issue of result.issues) {
        if (next[issue.field]) {continue;}
        next[issue.field] = issue.field === 'vehicleType' ? 'Choose a vehicle type.' :
          issue.field === 'name' ? 'Enter a profile name.' : issue.field === 'totalAxleCount' ?
            'Enter a positive whole number of axles.' : 'Enter a positive decimal using a dot.';
      }
      setErrors(next); setValidated(undefined);
    }
  }
  return <View style={styles.form}>
    <Text style={styles.heading}>Truck profile</Text>
    <Text style={styles.body}>Choose your vehicle. Enter the whole vehicle or combination, including cargo.</Text>
    {(['rigid-truck', 'tractor-semitrailer'] as const).map(type =>
      <View key={type} style={styles.choice}>
        <Button title={type === 'rigid-truck' ? 'Rigid truck — no trailer' : 'Tractor + one semitrailer'}
          disabled={storageBusy}
          accessibilityState={{selected: vehicleType === type}}
          onPress={() => {setVehicleType(type); setValidated(undefined); setErrors({});}} />
      </View>)}
    <Text style={styles.body}>Selected: {vehicleType === 'rigid-truck' ? 'Rigid truck' :
      vehicleType === 'tractor-semitrailer' ? 'Tractor + one semitrailer' : 'None'}</Text>
    {errors.vehicleType ? <Text style={[styles.feedback, styles.error]} accessibilityRole="alert">{errors.vehicleType}</Text> : null}
    <Text style={styles.body}>Input units: {mode}</Text>
    {modes.map(unitMode => <Button key={unitMode} title={`Use ${unitMode}`}
      disabled={storageBusy}
      accessibilityState={{selected: mode === unitMode}} onPress={() => {
        setMode(unitMode); setValidated(undefined); setErrors({});
      }} />)}
    <Text style={styles.body}>Each unit mode keeps a separate draft. In ft+in mode, enter both fields, using 0 when needed.</Text>
    {fields.map(([field, siLabel]) => {
      const label = siLabel.replace('(m)', `(${mode === 'ft+in/lb' ? 'ft' : mode.split('/')[0]})`)
        .replace('(kg)', `(${mode.split('/')[1]})`);
      return <View key={`${mode}:${restoreRevision}:${field}`} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <DraftInput onInputFocus={onInputFocus} accessibilityLabel={label} initialValue={values[field]}
        editable={!storageBusy}
        keyboardType={field === 'name' ? 'default' : field === 'totalAxleCount' ||
          (mode === 'ft+in/lb' && isDimension(field)) ? 'number-pad' : 'decimal-pad'}
        style={styles.input} onChangeText={text => {
          drafts.current[mode][field] = text;
          if (validated) {setValidated(undefined);}
          if (Object.keys(errors).length) {setErrors({});}
        }} />
      {mode === 'ft+in/lb' && isDimension(field) ? <View>
        <Text style={styles.body}>{siLabel.replace('(m)', '(in)')}</Text>
        <DraftInput onInputFocus={onInputFocus} accessibilityLabel={siLabel.replace('(m)', '(in)')} initialValue={inches.current[field]}
          editable={!storageBusy}
          keyboardType="decimal-pad" style={styles.input} onChangeText={text => {
            inches.current[field] = text;
            if (validated) {setValidated(undefined);}
            if (Object.keys(errors).length) {setErrors({});}
          }} />
      </View> : null}
      {errors[field] ? <Text style={[styles.feedback, styles.error]} accessibilityRole="alert">{errors[field]}</Text> : null}
    </View>;})}
    <Text style={styles.body}>Mass includes cargo, fuel and people. Count all installed axles, including lift axles.</Text>
    <Button variant="primary" title="Validate profile" disabled={storageBusy} onPress={validate} />
    {validated ? <View>
      <Text style={styles.feedback} accessibilityRole="alert">Profile format is valid. Road legality is not verified.</Text>
      <Text style={styles.body}>{`Validated SI: height ${validated.overallHeightMeters} m; width ${validated.overallWidthMeters} m; length ${validated.overallLengthMeters} m; mass ${validated.currentGrossMassKilograms} kg.`}</Text>
    </View> : null}
    {store ? <ProfilePersistence profile={validated} store={store} onBusyChange={setStorageBusy}
      onRestore={profile => {
        setRestoreRevision(previous => previous + 1);
        setVehicleType(profile.vehicleType); setMode('m/kg'); setErrors({});
        drafts.current['m/kg'] = {
          name: profile.name, overallHeightMeters: profile.overallHeightMeters,
          overallWidthMeters: profile.overallWidthMeters, overallLengthMeters: profile.overallLengthMeters,
          currentGrossMassKilograms: profile.currentGrossMassKilograms, totalAxleCount: String(profile.totalAxleCount),
        };
        setValidated(profile);
      }} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  form: {gap: 12, padding: 18, borderRadius: 18, backgroundColor: colors.paper,
    borderWidth: 1, borderColor: colors.line},
  heading: {fontSize: 24, fontWeight: '700', color: colors.ink},
  body: {fontSize: 13, lineHeight: 20, color: colors.muted},
  label: {fontSize: 13, fontWeight: '600', color: colors.ink},
  feedback: {fontSize: 13, lineHeight: 20, color: colors.ink, backgroundColor: colors.soft, padding: 10},
  error: {color: colors.error, backgroundColor: colors.errorSurface},
  choice: {marginVertical: 2}, field: {gap: 6, marginVertical: 4},
  input: {minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    padding: 12, color: colors.ink, backgroundColor: colors.paper, fontSize: 16},
});
