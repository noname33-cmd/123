import React, {useState} from 'react';
import {Button, StyleSheet, Text, TextInput, View, type TextInputProps} from 'react-native';
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

function DraftInput({initialValue, ...props}: Omit<TextInputProps, 'value' | 'defaultValue'> & {initialValue: string}) {
  // Seed once per editing session. Never echo delayed JS text over native typing.
  // The parent remounts inputs only on unit changes and explicit Restore.
  const [seed] = useState(initialValue);
  return <TextInput {...props} defaultValue={seed} />;
}

export function TruckProfileForm({store}: {store?: TruckProfileStore}) {
  const [storageBusy, setStorageBusy] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>();
  const [mode, setMode] = useState<Mode>('m/kg');
  const [drafts, setDrafts] = useState<Record<Mode, Record<Field, string>>>({
    'm/kg': {...empty}, 'ft/lb': {...empty}, 'in/lb': {...empty}, 'ft+in/lb': {...empty},
  });
  const [inches, setInches] = useState({...emptyInches});
  const [restoreRevision, setRestoreRevision] = useState(0);
  const values = drafts[mode];
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
          mode === 'ft+in/lb' ? feetAndInchesToMeters(values[field], inches[field]) :
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
    <Text>Choose your vehicle. Enter the whole vehicle or combination, including cargo.</Text>
    {(['rigid-truck', 'tractor-semitrailer'] as const).map(type =>
      <View key={type} style={styles.choice}>
        <Button title={type === 'rigid-truck' ? 'Rigid truck — no trailer' : 'Tractor + one semitrailer'}
          disabled={storageBusy}
          accessibilityState={{selected: vehicleType === type}}
          onPress={() => {setVehicleType(type); setValidated(undefined); setErrors({});}} />
      </View>)}
    <Text>Selected: {vehicleType === 'rigid-truck' ? 'Rigid truck' :
      vehicleType === 'tractor-semitrailer' ? 'Tractor + one semitrailer' : 'None'}</Text>
    {errors.vehicleType ? <Text accessibilityRole="alert">{errors.vehicleType}</Text> : null}
    <Text>Input units: {mode}</Text>
    {modes.map(unitMode => <Button key={unitMode} title={`Use ${unitMode}`}
      disabled={storageBusy}
      accessibilityState={{selected: mode === unitMode}} onPress={() => {
        setMode(unitMode); setValidated(undefined); setErrors({});
      }} />)}
    <Text>Each unit mode keeps a separate draft. In ft+in mode, enter both fields, using 0 when needed.</Text>
    {fields.map(([field, siLabel]) => {
      const label = siLabel.replace('(m)', `(${mode === 'ft+in/lb' ? 'ft' : mode.split('/')[0]})`)
        .replace('(kg)', `(${mode.split('/')[1]})`);
      return <View key={`${mode}:${restoreRevision}:${field}`} style={styles.field}>
      <Text>{label}</Text>
      <DraftInput accessibilityLabel={label} initialValue={values[field]}
        editable={!storageBusy}
        keyboardType={field === 'name' ? 'default' : field === 'totalAxleCount' ||
          (mode === 'ft+in/lb' && isDimension(field)) ? 'number-pad' : 'decimal-pad'}
        style={styles.input} onChangeText={text => {
          setDrafts(previous => ({...previous, [mode]: {...previous[mode], [field]: text}}));
          setValidated(undefined); setErrors({});
        }} />
      {mode === 'ft+in/lb' && isDimension(field) ? <View>
        <Text>{siLabel.replace('(m)', '(in)')}</Text>
        <DraftInput accessibilityLabel={siLabel.replace('(m)', '(in)')} initialValue={inches[field]}
          editable={!storageBusy}
          keyboardType="decimal-pad" style={styles.input} onChangeText={text => {
            setInches(previous => ({...previous, [field]: text}));
            setValidated(undefined); setErrors({});
          }} />
      </View> : null}
      {errors[field] ? <Text accessibilityRole="alert">{errors[field]}</Text> : null}
    </View>;})}
    <Text>Mass includes cargo, fuel and people. Count all installed axles, including lift axles.</Text>
    <Button title="Validate profile" disabled={storageBusy} onPress={validate} />
    {validated ? <View>
      <Text accessibilityRole="alert">Profile format is valid. Road legality is not verified.</Text>
      <Text>{`Validated SI: height ${validated.overallHeightMeters} m; width ${validated.overallWidthMeters} m; length ${validated.overallLengthMeters} m; mass ${validated.currentGrossMassKilograms} kg.`}</Text>
    </View> : null}
    {store ? <ProfilePersistence profile={validated} store={store} onBusyChange={setStorageBusy}
      onRestore={profile => {
        setRestoreRevision(previous => previous + 1);
        setVehicleType(profile.vehicleType); setMode('m/kg'); setErrors({});
        setDrafts(previous => ({...previous, 'm/kg': {
          name: profile.name, overallHeightMeters: profile.overallHeightMeters,
          overallWidthMeters: profile.overallWidthMeters, overallLengthMeters: profile.overallLengthMeters,
          currentGrossMassKilograms: profile.currentGrossMassKilograms, totalAxleCount: String(profile.totalAxleCount),
        }}));
        setValidated(profile);
      }} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  form: {gap: 12, marginTop: 24}, heading: {fontSize: 22, fontWeight: '600'},
  choice: {marginVertical: 4}, field: {gap: 4},
  input: {borderWidth: 1, borderColor: '#64748b', borderRadius: 8, padding: 12, color: '#102535'},
});
