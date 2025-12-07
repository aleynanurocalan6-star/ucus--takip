using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace _.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFlightTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Altitude",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "DepartureDate",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "DepartureTime",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "Destination",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "EndLon",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "FlightId",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "StartTimestamp",
                table: "Flights");

            migrationBuilder.DropColumn(
                name: "Altitude",
                table: "FlightPositions");

            migrationBuilder.RenameColumn(
                name: "StartLon",
                table: "Flights",
                newName: "StartLng");

            migrationBuilder.RenameColumn(
                name: "Progress",
                table: "Flights",
                newName: "EndLng");

            migrationBuilder.RenameColumn(
                name: "Origin",
                table: "Flights",
                newName: "FlightCode");

            migrationBuilder.RenameColumn(
                name: "Longitude",
                table: "FlightPositions",
                newName: "Lng");

            migrationBuilder.RenameColumn(
                name: "Latitude",
                table: "FlightPositions",
                newName: "Lat");

            migrationBuilder.AlterColumn<int>(
                name: "Speed",
                table: "Flights",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "REAL");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Timestamp",
                table: "FlightPositions",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<int>(
                name: "FlightId",
                table: "FlightPositions",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "StartLng",
                table: "Flights",
                newName: "StartLon");

            migrationBuilder.RenameColumn(
                name: "FlightCode",
                table: "Flights",
                newName: "Origin");

            migrationBuilder.RenameColumn(
                name: "EndLng",
                table: "Flights",
                newName: "Progress");

            migrationBuilder.RenameColumn(
                name: "Lng",
                table: "FlightPositions",
                newName: "Longitude");

            migrationBuilder.RenameColumn(
                name: "Lat",
                table: "FlightPositions",
                newName: "Latitude");

            migrationBuilder.AlterColumn<double>(
                name: "Speed",
                table: "Flights",
                type: "REAL",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<double>(
                name: "Altitude",
                table: "Flights",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "DepartureDate",
                table: "Flights",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DepartureTime",
                table: "Flights",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Destination",
                table: "Flights",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "EndLon",
                table: "Flights",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "FlightId",
                table: "Flights",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "StartTimestamp",
                table: "Flights",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "Timestamp",
                table: "FlightPositions",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "FlightId",
                table: "FlightPositions",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<double>(
                name: "Altitude",
                table: "FlightPositions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
