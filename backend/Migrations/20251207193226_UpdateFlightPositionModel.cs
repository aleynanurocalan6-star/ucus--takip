using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace _.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFlightPositionModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Lng",
                table: "FlightPositions",
                newName: "Speed");

            migrationBuilder.RenameColumn(
                name: "Lat",
                table: "FlightPositions",
                newName: "Longitude");

            migrationBuilder.AlterColumn<long>(
                name: "Timestamp",
                table: "FlightPositions",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "TEXT");

            migrationBuilder.AddColumn<double>(
                name: "Altitude",
                table: "FlightPositions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "FlightPositions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Altitude",
                table: "FlightPositions");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "FlightPositions");

            migrationBuilder.RenameColumn(
                name: "Speed",
                table: "FlightPositions",
                newName: "Lng");

            migrationBuilder.RenameColumn(
                name: "Longitude",
                table: "FlightPositions",
                newName: "Lat");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Timestamp",
                table: "FlightPositions",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "INTEGER");
        }
    }
}
