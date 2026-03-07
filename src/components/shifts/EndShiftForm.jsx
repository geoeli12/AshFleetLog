
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, LogOut, AlertCircle } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EndShiftForm({ shift, onSubmit, isLoading }) {
    const [endingOdometer, setEndingOdometer] = useState('');

    const handleSubmit = () => {
        onSubmit({
            ending_odometer: parseFloat(endingOdometer),
            end_time: new Date().toISOString(),
            status: 'completed'
        });
    };

    const totalMiles = endingOdometer ? parseFloat(endingOdometer) - shift.starting_odometer : 0;

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <LogOut className="h-4 w-4 text-white" />
                    </div>
                    End Shift
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Gauge className="h-4 w-4" /> Ending Odometer (miles)
                    </Label>
                    <Input type="number" placeholder="Enter ending odometer" value={endingOdometer}
                        onChange={(e) => setEndingOdometer(e.target.value)}
                        className="h-11 border-slate-200 rounded-xl bg-white" />
                </div>

                {endingOdometer && (
                    <div className="p-3 bg-white/60 rounded-xl">
                        <div className="text-sm text-slate-500">Total Miles This Shift</div>
                        <div className="text-2xl font-semibold text-slate-800">{totalMiles.toLocaleString()} mi</div>
                    </div>
                )}

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button disabled={!endingOdometer || isLoading}
                            className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg shadow-orange-500/25">
                            <LogOut className="h-4 w-4 mr-2" /> Clock Out & End Shift
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-500" /> Confirm End Shift
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to end your shift? You will have driven <span className="font-semibold">{totalMiles.toLocaleString()} miles</span> this shift.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSubmit} className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                                {isLoading ? 'Ending...' : 'End Shift'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

